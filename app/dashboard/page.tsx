import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.getUser()
  if (error || !data?.user) {
    redirect("/auth/login")
  }

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", data.user.id).single()

  const { data: activeList } = await supabase
    .from("shopping_lists")
    .select("*, items:shopping_list_items(*)")
    .eq("is_active", true)
    .single()

  const { count: templatesCount } = await supabase
    .from("shopping_lists")
    .select("*", { count: "exact", head: true })
    .eq("is_template", true)

  const totalItems = activeList?.items?.length || 0
  const purchasedItems = activeList?.items?.filter((item: any) => item.is_purchased).length || 0

  const handleSignOut = async () => {
    "use server"
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect("/")
  }

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Lista Familiar</h1>
          <p className="text-muted-foreground">Bienvenido, {profile?.display_name || data.user.email}</p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              PWA Instalable
            </Badge>
            {totalItems > 0 && (
              <Badge variant="secondary" className="text-xs">
                {Math.round((purchasedItems / totalItems) * 100)}% Completado
              </Badge>
            )}
          </div>
        </div>
        <form action={handleSignOut}>
          <Button variant="outline" type="submit">
            Cerrar Sesión
          </Button>
        </form>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Lista Actual</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {totalItems > 0
                ? `${purchasedItems} de ${totalItems} productos completados`
                : "No hay productos en la lista"}
            </p>
            <Button className="mt-4 w-full" asChild>
              <Link href="/shopping-list">Ver Lista</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Plantillas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              {templatesCount ? `${templatesCount} plantillas guardadas` : "Crea plantillas de listas frecuentes"}
            </p>
            <Button className="mt-4 w-full bg-transparent" variant="outline" asChild>
              <Link href="/templates">Gestionar Plantillas</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historial</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Revisa listas anteriores</p>
            <Button className="mt-4 w-full bg-transparent" variant="outline">
              Ver Historial
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
