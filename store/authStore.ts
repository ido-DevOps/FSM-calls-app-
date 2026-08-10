import { create } from "zustand";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "../types/database.types";

interface AuthState {
  session: Session | null;
  profile: Profile | null;
  /** True until the initial session read settles. Gates the whole app. */
  isLoading: boolean;
  /**
   * True while the profile row for the current session is in flight.
   *
   * Role guards MUST wait for this instead of reading `profile` directly:
   * `profile === null` means "role unknown" (still loading, or the fetch
   * failed), which is not the same as "this user has no special role". The
   * guards used to treat the two identically, so a null profile fell through
   * every check and rendered the admin/warehouse UI.
   */
  isProfileLoading: boolean;
  /** Set when the profile row could not be loaded (missing row, network). */
  profileError: string | null;
  setSession: (session: Session | null) => void;
  setProfile: (profile: Profile | null) => void;
  setProfileLoading: (isProfileLoading: boolean) => void;
  setProfileError: (profileError: string | null) => void;
  setLoading: (isLoading: boolean) => void;
  /** Clears all auth state — used on sign-out. */
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isLoading: true,
  isProfileLoading: false,
  profileError: null,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setProfileLoading: (isProfileLoading) => set({ isProfileLoading }),
  setProfileError: (profileError) => set({ profileError }),
  setLoading: (isLoading) => set({ isLoading }),
  reset: () =>
    set({
      session: null,
      profile: null,
      isProfileLoading: false,
      profileError: null,
    }),
}));
