import { useEffect } from "react";
import { supabase } from "../lib/supabase";
import { useAuthStore } from "../store/authStore";

/**
 * Bootstraps the auth store: loads the current session once on mount,
 * fetches the matching profile row (for role-based routing), and keeps
 * both in sync with Supabase auth state changes.
 *
 * Mount this once, near the root of the app.
 */
export function useAuthListener() {
  useEffect(() => {
    let isMounted = true;
    // Guards against a slow profile fetch landing after auth has moved on
    // (sign out, or a *different* user signing in). Without it, user A's
    // stalled response could overwrite user B's profile, leaving the app
    // holding session B + role A and routing B into the wrong role's UI.
    let profileEpoch = 0;

    const {
      setSession,
      setProfile,
      setLoading,
      setProfileLoading,
      setProfileError,
      reset,
    } = useAuthStore.getState();

    async function loadProfile(userId: string) {
      const epoch = ++profileEpoch;
      setProfileLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        // Stale response, or auth moved on while we were waiting.
        if (!isMounted || epoch !== profileEpoch) return;
        if (useAuthStore.getState().session?.user.id !== userId) return;

        if (error) {
          // Don't silently collapse a failure into "no role" — that used to
          // let an unprovisioned user fall through every role guard.
          setProfile(null);
          setProfileError(error.message);
        } else if (!data) {
          setProfile(null);
          setProfileError(
            "Your account has no profile record, so we can't tell which role you have. Contact an administrator."
          );
        } else {
          setProfile(data);
          setProfileError(null);
        }
      } catch (e) {
        if (!isMounted || epoch !== profileEpoch) return;
        setProfile(null);
        setProfileError(e instanceof Error ? e.message : "Failed to load your profile.");
      } finally {
        if (isMounted && epoch === profileEpoch) setProfileLoading(false);
      }
    }

    // The app-wide gate must settle even if the network is dead. Previously
    // `setLoading(false)` sat behind `await loadProfile(...)`, so an offline
    // cold start left the app on an infinite spinner with no way out — and a
    // rejected getSession() (corrupt AsyncStorage blob) never settled at all.
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!isMounted) return;
        setSession(data.session);
        if (data.session) {
          // Deliberately not awaited: role resolution is tracked separately
          // via isProfileLoading so it can't block first paint.
          void loadProfile(data.session.user.id);
        }
      })
      .catch(() => {
        if (!isMounted) return;
        setSession(null);
        setProfileError("Couldn't restore your session. Please sign in again.");
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      setSession(session);
      if (session) {
        void loadProfile(session.user.id);
      } else {
        // Invalidate any in-flight profile fetch so it can't repopulate
        // state after sign-out.
        profileEpoch++;
        reset();
      }
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);
}
