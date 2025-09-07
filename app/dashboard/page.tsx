"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { authManager, type User } from "@/lib/auth"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function DashboardPage() {
  const [user, setUser] = useState<User | null>(null)
  const [activeList, setActiveList] = useState<any>(null)
  const [templatesCount, setTemplatesCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const checkAuth = async () => {
      const currentUser = await authManager.getCurrentUser()
      if (!currentUser) {
        router.push("/auth/login")
        return
      }
      setUser(currentUser)
      await loadDashboardData(currentUser.id)
      setLoading(false)
    }

    checkAuth()
  }, [router])

  const loadDashboardData = async (userId: string) => {
    const supabase = createClient()

    const { data: activeListData } = await supabase
      .from("shopping_lists")
      .select("*, items:shopping_list_items(*)")
      .eq("is_active", true)
      .single()

    setActiveList(activeListData)

    const { count } = await supabase
      .from("shopping_lists")
      .select("*", { count: "exact", head: true })
      .eq("is_template", true)

    setTemplatesCount(count || 0)
  }

  const handleSignOut = async () => {
    await authManager.logout()
    router.push("/")
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex justify-center items-center min-h-[400px]">
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  const totalItems = activeList?.items?.length || 0
  const purchasedItems = activeList?.items?.filter((item: any) => item.is_purchased).length || 0

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Lista Familiar</h1>
          <p className="text-muted-foreground">Bienvenido, {user.display_name}</p>
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
        <Button variant="outline" onClick={handleSignOut}>
          Cerrar Sesión
        </Button>
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
