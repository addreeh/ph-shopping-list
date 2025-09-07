"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Plus, ShoppingCart, Trash2, RotateCcw, Save, Bell, BellOff } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface ShoppingListViewProps {
  activeList: any
  items: any[]
  sections: any[]
  frequentItems: any[]
  currentUser: any
}

export function ShoppingListView({
  activeList,
  items: initialItems,
  sections,
  frequentItems,
  currentUser,
}: ShoppingListViewProps) {
  const [items, setItems] = useState(initialItems)
  const [newItemName, setNewItemName] = useState("")
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [newItemUnit, setNewItemUnit] = useState("unidad")
  const [newItemSection, setNewItemSection] = useState("")
  const [newItemSupermarket, setNewItemSupermarket] = useState("")
  const [newItemNotes, setNewItemNotes] = useState("")
  const [isAddingItem, setIsAddingItem] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const supermarkets = ["Mercadona", "Family Cash", "Lidl"]

  useEffect(() => {
    if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted")
    }
  }, [])

  const itemsBySupermartAndSection = items.reduce((acc, item) => {
    const supermarket = item.supermarket || "Sin asignar"
    const sectionName = item.section?.name || "Sin categoría"

    if (!acc[supermarket]) {
      acc[supermarket] = {}
    }
    if (!acc[supermarket][sectionName]) {
      acc[supermarket][sectionName] = []
    }
    acc[supermarket][sectionName].push(item)
    return acc
  }, {})

  const filteredSuggestions = frequentItems.filter((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase()))

  const requestNotificationPermission = async () => {
    if ("Notification" in window) {
      const permission = await Notification.requestPermission()
      setNotificationsEnabled(permission === "granted")

      if (permission === "granted") {
        new Notification("Lista Familiar", {
          body: "Notificaciones activadas para tu lista de compras",
          icon: "/icon-192.jpg",
        })
      }
    }
  }

  const addItem = async (itemData: any) => {
    try {
      const { data, error } = await supabase
        .from("shopping_list_items")
        .insert({
          list_id: activeList.id,
          name: itemData.name,
          quantity: itemData.quantity || 1,
          unit: itemData.unit || "unidad",
          section_id: itemData.section_id,
          supermarket: itemData.supermarket,
          notes: itemData.notes,
          added_by: currentUser.id,
        })
        .select(`
          *,
          section:supermarket_sections(*),
          added_by_profile:profiles!shopping_list_items_added_by_fkey(display_name)
        `)
        .single()

      if (error) throw error

      setItems((prev) => [...prev, data])

      if (notificationsEnabled && "Notification" in window) {
        new Notification("Producto añadido", {
          body: `${itemData.name} se añadió a la lista${itemData.supermarket ? ` (${itemData.supermarket})` : ""}`,
          icon: "/icon-192.jpg",
          tag: "item-added",
        })
      }

      await supabase.rpc("upsert_frequent_item", {
        item_name: itemData.name,
        section_id: itemData.section_id,
        supermarket_name: itemData.supermarket,
      })

      setNewItemName("")
      setNewItemQuantity(1)
      setNewItemUnit("unidad")
      setNewItemSection("")
      setNewItemSupermarket("")
      setNewItemNotes("")
      setIsAddingItem(false)
    } catch (error) {
      console.error("Error adding item:", error)
    }
  }

  const addItemWithSupermarket = (supermarket: string, sectionId?: string) => {
    setNewItemSupermarket(supermarket)
    if (sectionId) {
      setNewItemSection(sectionId)
    }
    setIsAddingItem(true)
  }

  const togglePurchased = async (itemId: string, isPurchased: boolean) => {
    try {
      const { error } = await supabase
        .from("shopping_list_items")
        .update({
          is_purchased: isPurchased,
          purchased_by: isPurchased ? currentUser.id : null,
        })
        .eq("id", itemId)

      if (error) throw error

      setItems((prev) =>
        prev.map((item) =>
          item.id === itemId
            ? {
                ...item,
                is_purchased: isPurchased,
                purchased_by: isPurchased ? currentUser.id : null,
                purchased_by_profile: isPurchased ? { display_name: currentUser.display_name } : null,
              }
            : item,
        ),
      )

      if (isPurchased && notificationsEnabled && "Notification" in window) {
        const item = items.find((i) => i.id === itemId)
        if (item) {
          new Notification("Producto comprado", {
            body: `${item.name} marcado como comprado`,
            icon: "/icon-192.jpg",
            tag: "item-purchased",
          })
        }
      }
    } catch (error) {
      console.error("Error updating item:", error)
    }
  }

  const deleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase.from("shopping_list_items").delete().eq("id", itemId)

      if (error) throw error

      setItems((prev) => prev.filter((item) => item.id !== itemId))
    } catch (error) {
      console.error("Error deleting item:", error)
    }
  }

  const resetList = async () => {
    try {
      const { error } = await supabase
        .from("shopping_list_items")
        .update({ is_purchased: false, purchased_by: null })
        .eq("list_id", activeList.id)

      if (error) throw error

      setItems((prev) =>
        prev.map((item) => ({
          ...item,
          is_purchased: false,
          purchased_by: null,
          purchased_by_profile: null,
        })),
      )
    } catch (error) {
      console.error("Error resetting list:", error)
    }
  }

  const saveAsTemplate = async () => {
    if (items.length === 0) {
      alert("No hay productos en la lista para guardar como plantilla")
      return
    }

    const templateName = prompt("Nombre para la plantilla:", `Plantilla ${activeList.name}`)
    if (!templateName) return

    try {
      const { data: template, error: templateError } = await supabase
        .from("shopping_lists")
        .insert({
          name: templateName,
          is_template: true,
          created_by: currentUser.id,
        })
        .select()
        .single()

      if (templateError) throw templateError

      const itemsToInsert = items.map((item) => ({
        list_id: template.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        section_id: item.section_id,
        supermarket: item.supermarket,
        notes: item.notes,
        added_by: currentUser.id,
      }))

      const { error: itemsError } = await supabase.from("shopping_list_items").insert(itemsToInsert)

      if (itemsError) throw itemsError

      alert("Plantilla guardada exitosamente")
    } catch (error) {
      console.error("Error saving template:", error)
      alert("Error al guardar la plantilla")
    }
  }

  const addFromSuggestion = (suggestion: any) => {
    addItem({
      name: suggestion.name,
      quantity: 1,
      unit: "unidad",
      section_id: suggestion.section_id,
      supermarket: suggestion.supermarket,
      notes: "",
    })
    setShowSuggestions(false)
    setSearchTerm("")
  }

  const totalItems = items.length
  const purchasedItems = items.filter((item) => item.is_purchased).length
  const progress = totalItems > 0 ? (purchasedItems / totalItems) * 100 : 0

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link href="/dashboard">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-semibold">{activeList?.name}</h1>
                <p className="text-sm text-muted-foreground">
                  {purchasedItems} de {totalItems} completados
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={notificationsEnabled ? () => setNotificationsEnabled(false) : requestNotificationPermission}
              >
                {notificationsEnabled ? <Bell className="h-4 w-4" /> : <BellOff className="h-4 w-4" />}
              </Button>
              <Button variant="outline" size="sm" onClick={saveAsTemplate}>
                <Save className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={resetList}>
                <RotateCcw className="h-4 w-4" />
              </Button>
              <Dialog open={isAddingItem} onOpenChange={setIsAddingItem}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Añadir producto</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="name">Producto</Label>
                      <Input
                        id="name"
                        value={newItemName}
                        onChange={(e) => setNewItemName(e.target.value)}
                        placeholder="Nombre del producto"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="quantity">Cantidad</Label>
                        <Input
                          id="quantity"
                          type="number"
                          value={newItemQuantity}
                          onChange={(e) => setNewItemQuantity(Number.parseInt(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit">Unidad</Label>
                        <Select value={newItemUnit} onValueChange={setNewItemUnit}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="unidad">Unidad</SelectItem>
                            <SelectItem value="kg">Kilogramo</SelectItem>
                            <SelectItem value="g">Gramo</SelectItem>
                            <SelectItem value="l">Litro</SelectItem>
                            <SelectItem value="ml">Mililitro</SelectItem>
                            <SelectItem value="paquete">Paquete</SelectItem>
                            <SelectItem value="caja">Caja</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="supermarket">Supermercado</Label>
                      <Select value={newItemSupermarket} onValueChange={setNewItemSupermarket}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar supermercado" />
                        </SelectTrigger>
                        <SelectContent>
                          {supermarkets.map((supermarket) => (
                            <SelectItem key={supermarket} value={supermarket}>
                              {supermarket}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="section">Sección</Label>
                      <Select value={newItemSection} onValueChange={setNewItemSection}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar sección" />
                        </SelectTrigger>
                        <SelectContent>
                          {sections.map((section) => (
                            <SelectItem key={section.id} value={section.id}>
                              {section.icon} {section.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="notes">Notas (opcional)</Label>
                      <Textarea
                        id="notes"
                        value={newItemNotes}
                        onChange={(e) => setNewItemNotes(e.target.value)}
                        placeholder="Marca específica, tamaño, etc."
                        rows={2}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          addItem({
                            name: newItemName,
                            quantity: newItemQuantity,
                            unit: newItemUnit,
                            section_id: newItemSection,
                            supermarket: newItemSupermarket,
                            notes: newItemNotes,
                          })
                        }
                        disabled={!newItemName.trim()}
                        className="flex-1"
                      >
                        Añadir producto
                      </Button>
                      <Button variant="outline" onClick={() => setShowSuggestions(!showSuggestions)}>
                        Sugerencias
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="mt-3">
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {showSuggestions && (
        <div className="container mx-auto px-4 py-4 border-b bg-muted/50">
          <div className="space-y-3">
            <div>
              <Input
                placeholder="Buscar sugerencias..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {filteredSuggestions.slice(0, 10).map((item) => (
                <Button
                  key={item.id}
                  variant="outline"
                  size="sm"
                  onClick={() => addFromSuggestion(item)}
                  className="text-xs"
                >
                  {item.section?.icon} {item.name} {item.supermarket && `(${item.supermarket})`}
                </Button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="container mx-auto px-4 py-6 space-y-6">
        {Object.entries(itemsBySupermartAndSection).map(([supermarket, sectionGroups]) => {
          const supermarketItems = Object.values(sectionGroups).flat()
          const supermarketPurchased = supermarketItems.filter((item: any) => item.is_purchased).length
          const supermarketTotal = supermarketItems.length

          return (
            <div key={supermarket} className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-primary/5 rounded-lg border-2 border-primary/20">
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-primary">🏪 {supermarket}</h2>
                  <Badge variant="secondary" className="bg-primary/10">
                    {supermarketPurchased}/{supermarketTotal}
                  </Badge>
                </div>
                {supermarket !== "Sin asignar" && (
                  <Button
                    size="sm"
                    onClick={() => addItemWithSupermarket(supermarket)}
                    className="bg-primary/10 text-primary hover:bg-primary/20"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Añadir a {supermarket}
                  </Button>
                )}
              </div>

              <div className="space-y-4 ml-4">
                {Object.entries(sectionGroups).map(([sectionName, sectionItems]: [string, any]) => {
                  const section = sections.find((s) => s.name === sectionName)
                  const sectionPurchased = sectionItems.filter((item: any) => item.is_purchased).length
                  const sectionTotal = sectionItems.length

                  return (
                    <Card key={`${supermarket}-${sectionName}`}>
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg flex items-center gap-2">
                            <span className="text-xl">{section?.icon || "📦"}</span>
                            {sectionName}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {sectionPurchased}/{sectionTotal}
                            </Badge>
                            {supermarket !== "Sin asignar" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => addItemWithSupermarket(supermarket, section?.id)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {sectionItems.map((item: any) => (
                          <div
                            key={item.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border ${
                              item.is_purchased ? "bg-muted/50 opacity-60" : "bg-background"
                            }`}
                          >
                            <Checkbox
                              checked={item.is_purchased}
                              onCheckedChange={(checked) => togglePurchased(item.id, checked as boolean)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className={`font-medium ${item.is_purchased ? "line-through" : ""}`}>
                                {item.quantity} {item.unit} - {item.name}
                              </div>
                              {item.notes && <div className="text-sm text-muted-foreground">{item.notes}</div>}
                              <div className="text-xs text-muted-foreground mt-1">
                                Añadido por {item.added_by_profile?.display_name}
                                {item.is_purchased && item.purchased_by_profile && (
                                  <span> • Comprado por {item.purchased_by_profile.display_name}</span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deleteItem(item.id)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  )
                })}
              </div>
            </div>
          )
        })}

        {totalItems === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">Lista vacía</h3>
              <p className="text-muted-foreground mb-4">Añade productos para empezar tu lista de compras</p>
              <Button onClick={() => setIsAddingItem(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Añadir primer producto
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
