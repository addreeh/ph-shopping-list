import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { TemplatesView } from "@/components/templates-view"

export default async function TemplatesPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get all templates
  const { data: templates } = await supabase
    .from("shopping_lists")
    .select(`
      *,
      items:shopping_list_items(
        *,
        section:supermarket_sections(*)
      ),
      created_by_profile:profiles!shopping_lists_created_by_fkey(display_name)
    `)
    .eq("is_template", true)
    .order("created_at", { ascending: false })

  // Get supermarket sections
  const { data: sections } = await supabase
    .from("supermarket_sections")
    .select("*")
    .order("sort_order", { ascending: true })

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  return <TemplatesView templates={templates || []} sections={sections || []} currentUser={profile} />
}
