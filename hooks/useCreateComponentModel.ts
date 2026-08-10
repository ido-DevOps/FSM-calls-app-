import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "../lib/supabase";

export interface NewComponentModelInput {
  category: string;
  model_name: string;
}

/** Adds a brand-new (category, model) pair to the catalog — the "+ Add Model" action. */
export function useCreateComponentModel() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: NewComponentModelInput) => {
      const { data, error } = await supabase
        .from("component_models")
        .insert({
          category: input.category.trim().toLowerCase(),
          model_name: input.model_name.trim(),
        })
        .select()
        .single();

      if (error) {
        throw new Error(
          error.code === "23505"
            ? "That model already exists in this category."
            : error.message
        );
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["component_models"] });
    },
  });
}
