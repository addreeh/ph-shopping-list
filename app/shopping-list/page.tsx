import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ShoppingListView } from "@/components/shopping-list-view"

export default async function ShoppingListPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  // Get or create active shopping list
  let { data: activeList } = await supabase.from("shopping_lists").select("*").eq("is_active", true).single()

  if (!activeList) {
    // Create a new active list
    const { data: newList } = await supabase
      .from("shopping_lists")
      .insert({
        name: `Lista de la semana - ${new Date().toLocaleDateString("es-ES")}`,
        is_active: true,
        created_by: data.user.id,
      })
      .select()
      .single()

    activeList = newList
  }

  // Get shopping list items organized by sections
  const { data: items } = await supabase
    .from("shopping_list_items")
    .select(`
      *,
      section:supermarket_sections(*),
      added_by_profile:profiles!shopping_list_items_added_by_fkey(display_name),
      purchased_by_profile:profiles!shopping_list_items_purchased_by_fkey(display_name)
    `)
    .eq("list_id", activeList?.id)
    .order("created_at", { ascending: true })

  // Get supermarket sections
  const { data: sections } = await supabase
    .from("supermarket_sections")
    .select("*")
    .order("sort_order", { ascending: true })

  // Get frequent items for suggestions
  const { data: frequentItems } = await supabase
    .from("frequent_items")
    .select("*, section:supermarket_sections(*)")
    .order("usage_count", { ascending: false })
    .limit(20)

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  return (
    <ShoppingListView
      activeList={activeList}
      items={items || []}
      sections={sections || []}
      frequentItems={frequentItems || []}
      currentUser={profile}
    />
  )
}
