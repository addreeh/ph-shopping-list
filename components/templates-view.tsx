"use client"

import { useState } from "react"
import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Plus, Copy, Trash2, ShoppingCart } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface TemplatesViewProps {
  templates: any[]
  sections: any[]
  currentUser: any
}

export function TemplatesView({ templates: initialTemplates, sections, currentUser }: TemplatesViewProps) {
  const [templates, setTemplates] = useState(initialTemplates)
  const [isCreatingTemplate, setIsCreatingTemplate] = useState(false)
  const [templateName, setTemplateName] = useState("")
  const [templateItems, setTemplateItems] = useState<any[]>([])
  const [newItemName, setNewItemName] = useState("")
  const [newItemQuantity, setNewItemQuantity] = useState(1)
  const [newItemUnit, setNewItemUnit] = useState("unidad")
  const [newItemSection, setNewItemSection] = useState("")
  const [newItemNotes, setNewItemNotes] = useState("")
  const supabase = createClient()
  const router = useRouter()

  const createTemplate = async () => {
    if (!templateName.trim() || templateItems.length === 0) return

    try {
      // Create template
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

      // Add items to template
      const itemsToInsert = templateItems.map((item) => ({
        list_id: template.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        section_id: item.section_id,
        notes: item.notes,
        added_by: currentUser.id,
      }))

      const { error: itemsError } = await supabase.from("shopping_list_items").insert(itemsToInsert)

      if (itemsError) throw itemsError

      // Refresh templates
      const { data: updatedTemplates } = await supabase
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

      setTemplates(updatedTemplates || [])
      setIsCreatingTemplate(false)
      setTemplateName("")
      setTemplateItems([])
    } catch (error) {
      console.error("Error creating template:", error)
    }
  }

  const addItemToTemplate = () => {
    if (!newItemName.trim()) return

    const newItem = {
      id: Date.now().toString(),
      name: newItemName,
      quantity: newItemQuantity,
      unit: newItemUnit,
      section_id: newItemSection,
      notes: newItemNotes,
      section: sections.find((s) => s.id === newItemSection),
    }

    setTemplateItems((prev) => [...prev, newItem])
    setNewItemName("")
    setNewItemQuantity(1)
    setNewItemUnit("unidad")
    setNewItemSection("")
    setNewItemNotes("")
  }

  const removeItemFromTemplate = (itemId: string) => {
    setTemplateItems((prev) => prev.filter((item) => item.id !== itemId))
  }

  const useTemplate = async (template: any) => {
    try {
      // Deactivate current active list
      await supabase.from("shopping_lists").update({ is_active: false }).eq("is_active", true)

      // Create new list from template
      const { data: newList, error: listError } = await supabase
        .from("shopping_lists")
        .insert({
          name: `${template.name} - ${new Date().toLocaleDateString("es-ES")}`,
          is_active: true,
          created_by: currentUser.id,
        })
        .select()
        .single()

      if (listError) throw listError

      // Copy items from template
      const itemsToInsert = template.items.map((item: any) => ({
        list_id: newList.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        section_id: item.section_id,
        notes: item.notes,
        added_by: currentUser.id,
      }))

      const { error: itemsError } = await supabase.from("shopping_list_items").insert(itemsToInsert)

      if (itemsError) throw itemsError

      router.push("/shopping-list")
    } catch (error) {
      console.error("Error using template:", error)
    }
  }

  const deleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase.from("shopping_lists").delete().eq("id", templateId)

      if (error) throw error

      setTemplates((prev) => prev.filter((template) => template.id !== templateId))
    } catch (error) {
      console.error("Error deleting template:", error)
    }
  }

  const saveCurrentListAsTemplate = async () => {
    try {
      // Get current active list
      const { data: activeList } = await supabase
        .from("shopping_lists")
        .select(`
          *,
          items:shopping_list_items(*)
        `)
        .eq("is_active", true)
        .single()

      if (!activeList || activeList.items.length === 0) {
        alert("No hay lista activa o está vacía")
        return
      }

      const templateName = prompt("Nombre para la plantilla:", `Plantilla ${activeList.name}`)
      if (!templateName) return

      // Create template
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

      // Copy items to template
      const itemsToInsert = activeList.items.map((item: any) => ({
        list_id: template.id,
        name: item.name,
        quantity: item.quantity,
        unit: item.unit,
        section_id: item.section_id,
        notes: item.notes,
        added_by: currentUser.id,
      }))

      const { error: itemsError } = await supabase.from("shopping_list_items").insert(itemsToInsert)

      if (itemsError) throw itemsError

      // Refresh templates
      const { data: updatedTemplates } = await supabase
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

      setTemplates(updatedTemplates || [])
    } catch (error) {
      console.error("Error saving template:", error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
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
                <h1 className="text-xl font-semibold">Plantillas</h1>
                <p className="text-sm text-muted-foreground">{templates.length} plantillas guardadas</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={saveCurrentListAsTemplate}>
                <Copy className="h-4 w-4 mr-1" />
                Guardar Lista
              </Button>
              <Dialog open={isCreatingTemplate} onOpenChange={setIsCreatingTemplate}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Nueva
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Crear nueva plantilla</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="templateName">Nombre de la plantilla</Label>
                      <Input
                        id="templateName"
                        value={templateName}
                        onChange={(e) => setTemplateName(e.target.value)}
                        placeholder="Ej: Compra semanal básica"
                      />
                    </div>

                    {/* Add items to template */}
                    <div className="border rounded-lg p-4 space-y-4">
                      <h3 className="font-medium">Añadir productos</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="itemName">Producto</Label>
                          <Input
                            id="itemName"
                            value={newItemName}
                            onChange={(e) => setNewItemName(e.target.value)}
                            placeholder="Nombre del producto"
                          />
                        </div>
                        <div>
                          <Label htmlFor="itemSection">Sección</Label>
                          <Select value={newItemSection} onValueChange={setNewItemSection}>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar" />
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
                          <Label htmlFor="itemQuantity">Cantidad</Label>
                          <Input
                            id="itemQuantity"
                            type="number"
                            value={newItemQuantity}
                            onChange={(e) => setNewItemQuantity(Number.parseInt(e.target.value))}
                            min="1"
                          />
                        </div>
                        <div>
                          <Label htmlFor="itemUnit">Unidad</Label>
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
                        <Label htmlFor="itemNotes">Notas (opcional)</Label>
                        <Textarea
                          id="itemNotes"
                          value={newItemNotes}
                          onChange={(e) => setNewItemNotes(e.target.value)}
                          placeholder="Marca específica, tamaño, etc."
                          rows={2}
                        />
                      </div>
                      <Button onClick={addItemToTemplate} disabled={!newItemName.trim()} className="w-full">
                        Añadir producto
                      </Button>
                    </div>

                    {/* Template items list */}
                    {templateItems.length > 0 && (
                      <div className="space-y-2">
                        <h3 className="font-medium">Productos en la plantilla ({templateItems.length})</h3>
                        <div className="max-h-40 overflow-y-auto space-y-2">
                          {templateItems.map((item) => (
                            <div key={item.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex-1">
                                <span className="font-medium">
                                  {item.quantity} {item.unit} - {item.name}
                                </span>
                                <div className="text-sm text-muted-foreground">
                                  {item.section?.icon} {item.section?.name}
                                  {item.notes && ` • ${item.notes}`}
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeItemFromTemplate(item.id)}
                                className="text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <Button
                      onClick={createTemplate}
                      disabled={!templateName.trim() || templateItems.length === 0}
                      className="w-full"
                    >
                      Crear plantilla
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
      </div>

      {/* Templates list */}
      <div className="container mx-auto px-4 py-6">
        {templates.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No hay plantillas</h3>
              <p className="text-muted-foreground mb-4">Crea plantillas para reutilizar listas de compras frecuentes</p>
              <Button onClick={() => setIsCreatingTemplate(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Crear primera plantilla
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{template.items?.length || 0} productos</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Por {template.created_by_profile?.display_name}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteTemplate(template.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Show first few items */}
                    <div className="space-y-1">
                      {template.items?.slice(0, 3).map((item: any) => (
                        <div key={item.id} className="text-sm flex items-center gap-2">
                          <span>{item.section?.icon}</span>
                          <span>
                            {item.quantity} {item.unit} - {item.name}
                          </span>
                        </div>
                      ))}
                      {template.items?.length > 3 && (
                        <div className="text-xs text-muted-foreground">+{template.items.length - 3} productos más</div>
                      )}
                    </div>

                    <Button onClick={() => useTemplate(template)} className="w-full">
                      <Copy className="h-4 w-4 mr-2" />
                      Usar plantilla
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
