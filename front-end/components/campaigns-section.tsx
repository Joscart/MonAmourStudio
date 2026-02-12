"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { campaignsApi, publicationsApi } from "@/lib/api"
import type {
  CampanaResponse,
  CampanaCreate,
  CampanaUpdate,
  PublicacionCreate,
  PublicacionResponse,
} from "@/lib/types"
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  Calendar,
  Upload,
  Eye,
  Play,
  Clock,
  XIcon,
  Check,
  ImageIcon,
  Film,
  Instagram,
  Facebook,
  Send,
  Power,
  ChevronLeft,
} from "lucide-react"

/* ── helpers ──────────────────────────────────────────────── */

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" })
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
}

const CANALES = [
  { value: "instagram_post", label: "Instagram Post", icon: Instagram },
  { value: "instagram_reel", label: "Instagram Reel", icon: Film },
  { value: "tiktok", label: "TikTok", icon: Play },
  { value: "facebook", label: "Facebook", icon: Facebook },
] as const

const MEDIA_TYPES = [
  { value: "imagen", label: "Imagen", icon: ImageIcon },
  { value: "video", label: "Video", icon: Film },
] as const

/* ── Main component ───────────────────────────────────────── */

export function CampaignsSection() {
  /* ── campaigns list state ── */
  const [campaigns, setCampaigns] = useState<CampanaResponse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  /* ── campaign form state ── */
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<CampanaResponse | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<CampanaCreate>({
    titulo: "",
    mensaje_global: "",
    segmentacion: null,
    fecha_inicio: "",
    fecha_fin: "",
  })

  /* ── campaign detail / publications state ── */
  const [selectedCampaign, setSelectedCampaign] = useState<CampanaResponse | null>(null)
  const [publications, setPublications] = useState<PublicacionResponse[]>([])
  const [pubLoading, setPubLoading] = useState(false)

  /* ── publication form state ── */
  const [showPubForm, setShowPubForm] = useState(false)
  const [pubSaving, setPubSaving] = useState(false)
  const [pubForm, setPubForm] = useState<PublicacionCreate>({
    campana_id: "",
    tipo_media: "imagen",
    media_url: null,
    caption: "",
    canal: "instagram_post",
    scheduled_at: null,
  })
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const [mediaPreview, setMediaPreview] = useState<string | null>(null)
  const [mediaUploading, setMediaUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  /* ── Fetch campaigns ──────────────────────────────────────── */

  const fetchCampaigns = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await campaignsApi.list()
      setCampaigns(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al cargar campañas")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCampaigns()
  }, [fetchCampaigns])

  /* ── Fetch publications for a campaign ───────────────────── */

  const openCampaign = async (c: CampanaResponse) => {
    setSelectedCampaign(c)
    setPubLoading(true)
    try {
      const pubs = await publicationsApi.listByCampaign(c.id)
      setPublications(pubs)
    } catch {
      setPublications([])
    } finally {
      setPubLoading(false)
    }
  }

  /* ── Campaign CRUD ─────────────────────────────────────── */

  const resetForm = () => {
    setFormData({ titulo: "", mensaje_global: "", segmentacion: null, fecha_inicio: "", fecha_fin: "" })
    setEditing(null)
    setShowForm(false)
  }

  const startEdit = (c: CampanaResponse) => {
    setEditing(c)
    setFormData({
      titulo: c.titulo,
      mensaje_global: c.mensaje_global,
      segmentacion: c.segmentacion,
      fecha_inicio: c.fecha_inicio.slice(0, 10),
      fecha_fin: c.fecha_fin.slice(0, 10),
    })
    setShowForm(true)
  }

  const startCreate = () => {
    resetForm()
    setShowForm(true)
  }

  const saveCampaign = async () => {
    try {
      setSaving(true)
      if (editing) {
        const body: CampanaUpdate = { ...formData }
        await campaignsApi.update(editing.id, body)
      } else {
        await campaignsApi.create(formData)
      }
      resetForm()
      await fetchCampaigns()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al guardar campaña")
    } finally {
      setSaving(false)
    }
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm("¿Eliminar esta campaña y todas sus publicaciones?")) return
    try {
      await campaignsApi.delete(id)
      if (selectedCampaign?.id === id) setSelectedCampaign(null)
      await fetchCampaigns()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar")
    }
  }

  const activateCampaign = async (id: string) => {
    try {
      await campaignsApi.activate(id)
      await fetchCampaigns()
      if (selectedCampaign?.id === id) {
        const updated = await campaignsApi.get(id)
        setSelectedCampaign(updated)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al activar")
    }
  }

  /* ── Publication CRUD ──────────────────────────────────── */

  const resetPubForm = () => {
    setPubForm({ campana_id: "", tipo_media: "imagen", media_url: null, caption: "", canal: "instagram_post", scheduled_at: null })
    setMediaFile(null)
    setMediaPreview(null)
    setShowPubForm(false)
  }

  const openPubForm = () => {
    if (!selectedCampaign) return
    resetPubForm()
    setPubForm(prev => ({ ...prev, campana_id: selectedCampaign.id }))
    setShowPubForm(true)
  }

  const handleMediaSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setMediaFile(f)
    const isVideo = f.type.startsWith("video/")
    setPubForm(prev => ({ ...prev, tipo_media: isVideo ? "video" : "imagen" }))
    if (!isVideo) {
      const reader = new FileReader()
      reader.onload = () => setMediaPreview(reader.result as string)
      reader.readAsDataURL(f)
    } else {
      setMediaPreview(null)
    }
  }

  const savePublication = async () => {
    if (!selectedCampaign) return
    try {
      setPubSaving(true)

      let mediaUrl = pubForm.media_url
      if (mediaFile) {
        setMediaUploading(true)
        const upload = await publicationsApi.uploadMedia(mediaFile)
        mediaUrl = upload.url
        setMediaUploading(false)
      }

      await publicationsApi.create({ ...pubForm, campana_id: selectedCampaign.id, media_url: mediaUrl })
      resetPubForm()
      const pubs = await publicationsApi.listByCampaign(selectedCampaign.id)
      setPublications(pubs)
      await fetchCampaigns()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al crear publicación")
    } finally {
      setPubSaving(false)
      setMediaUploading(false)
    }
  }

  const deletePublication = async (pubId: string) => {
    if (!confirm("¿Eliminar esta publicación?")) return
    try {
      await publicationsApi.delete(pubId)
      if (selectedCampaign) {
        const pubs = await publicationsApi.listByCampaign(selectedCampaign.id)
        setPublications(pubs)
        await fetchCampaigns()
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al eliminar publicación")
    }
  }

  const publishNow = async (pubId: string) => {
    try {
      await publicationsApi.publish(pubId)
      if (selectedCampaign) {
        const pubs = await publicationsApi.listByCampaign(selectedCampaign.id)
        setPublications(pubs)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al publicar")
    }
  }

  const schedulePub = async (pubId: string, datetime: string) => {
    try {
      await publicationsApi.schedule(pubId, datetime)
      if (selectedCampaign) {
        const pubs = await publicationsApi.listByCampaign(selectedCampaign.id)
        setPublications(pubs)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error al programar")
    }
  }

  /* ── Calendar helpers ──────────────────────────────────── */

  const getCalendarDays = () => {
    if (!selectedCampaign) return []
    const start = new Date(selectedCampaign.fecha_inicio)
    const end = new Date(selectedCampaign.fecha_fin)
    const days: { date: Date; pubs: PublicacionResponse[] }[] = []
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const iso = d.toISOString().slice(0, 10)
      const dayPubs = publications.filter(p => p.scheduled_at?.startsWith(iso))
      days.push({ date: new Date(d), pubs: dayPubs })
    }
    return days
  }

  /* ── Schedule modal state ──────────────────────────────── */
  const [schedulingPub, setSchedulingPub] = useState<string | null>(null)
  const [scheduleDate, setScheduleDate] = useState("")

  /* ──────────────────────────────────────────────────────── */
  /* ── RENDER ─────────────────────────────────────────────── */
  /* ──────────────────────────────────────────────────────── */

  /* ── Error banner ── */
  const errorBanner = error && (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3 mb-4 flex items-center justify-between">
      <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
      <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600"><XIcon className="h-4 w-4" /></button>
    </div>
  )

  /* ── Campaign detail view ────────────────────────────────── */
  if (selectedCampaign) {
    const calendarDays = getCalendarDays()

    return (
      <div className="space-y-6">
        {errorBanner}

        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedCampaign(null)}>
              <ChevronLeft className="h-4 w-4 mr-1" /> Volver
            </Button>
            <div>
              <h2 className="text-xl font-bold">{selectedCampaign.titulo}</h2>
              <p className="text-sm text-muted-foreground">
                {fmtDate(selectedCampaign.fecha_inicio)} — {fmtDate(selectedCampaign.fecha_fin)}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {!selectedCampaign.activa && (
              <Button size="sm" onClick={() => activateCampaign(selectedCampaign.id)} className="bg-green-600 hover:bg-green-700 text-white">
                <Power className="h-4 w-4 mr-1" /> Activar
              </Button>
            )}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${selectedCampaign.activa ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
              {selectedCampaign.activa ? "Activa" : "Inactiva"}
            </span>
          </div>
        </div>

        {/* Campaign info card */}
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur rounded-xl border border-gray-200 dark:border-white/10 p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Mensaje global</p>
              <p className="font-medium mt-1">{selectedCampaign.mensaje_global}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Segmentación</p>
              <p className="font-medium mt-1">{selectedCampaign.segmentacion || "Sin segmentación"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Publicaciones</p>
              <p className="font-medium mt-1">{publications.length}</p>
            </div>
          </div>
        </div>

        {/* Publication calendar */}
        {calendarDays.length > 0 && (
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur rounded-xl border border-gray-200 dark:border-white/10 p-4">
            <h3 className="font-semibold mb-3 flex items-center gap-2"><Calendar className="h-4 w-4" /> Calendario de publicaciones</h3>
            <div className="grid grid-cols-7 gap-1 text-xs">
              {["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"].map(d => (
                <div key={d} className="text-center font-medium text-muted-foreground py-1">{d}</div>
              ))}
              {/* pad to start on correct day */}
              {Array.from({ length: (calendarDays[0]?.date.getDay() + 6) % 7 }).map((_, i) => (
                <div key={`pad-${i}`} />
              ))}
              {calendarDays.map(({ date, pubs }, i) => (
                <div
                  key={i}
                  className={`min-h-[56px] rounded-lg p-1 border ${pubs.length > 0 ? "border-primary/30 bg-primary/5" : "border-transparent"}`}
                >
                  <span className="text-muted-foreground">{date.getDate()}</span>
                  {pubs.map(p => (
                    <div key={p.id} className="mt-0.5 truncate text-[10px] font-medium px-1 rounded bg-primary/10 text-primary">
                      {CANALES.find(c => c.value === p.canal)?.label || p.canal}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Publications list + add button */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Publicaciones</h3>
          <Button size="sm" onClick={openPubForm}>
            <Plus className="h-4 w-4 mr-1" /> Nueva publicación
          </Button>
        </div>

        {/* Publication creation form */}
        {showPubForm && (
          <div className="bg-white/80 dark:bg-white/5 backdrop-blur rounded-xl border border-gray-200 dark:border-white/10 p-5 space-y-4">
            <h4 className="font-semibold">Nueva publicación</h4>

            {/* Media upload */}
            <div>
              <label className="text-sm font-medium block mb-1">Media</label>
              <input ref={fileRef} type="file" accept="image/*,video/mp4,video/quicktime,video/webm" className="hidden" onChange={handleMediaSelect} />
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-300 dark:border-white/20 rounded-lg p-6 text-center cursor-pointer hover:border-primary transition-colors"
              >
                {mediaPreview ? (
                  <img src={mediaPreview} alt="preview" className="mx-auto max-h-48 rounded-lg object-cover" />
                ) : mediaFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <Film className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">{mediaFile.name}</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">Haz clic para subir imagen o video</p>
                  </div>
                )}
              </div>
              {mediaUploading && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> Subiendo...
                </p>
              )}
            </div>

            {/* Tipo media */}
            <div>
              <label className="text-sm font-medium block mb-1">Tipo de media</label>
              <div className="flex gap-2">
                {MEDIA_TYPES.map(mt => {
                  const Icon = mt.icon
                  return (
                    <button
                      key={mt.value}
                      type="button"
                      onClick={() => setPubForm(prev => ({ ...prev, tipo_media: mt.value }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${pubForm.tipo_media === mt.value ? "border-primary bg-primary/10 text-primary" : "border-gray-200 dark:border-white/10 hover:border-primary/50"}`}
                    >
                      <Icon className="h-4 w-4" /> {mt.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Canal / Plataforma */}
            <div>
              <label className="text-sm font-medium block mb-1">Canal / Plataforma</label>
              <div className="flex flex-wrap gap-2">
                {CANALES.map(ch => {
                  const Icon = ch.icon
                  return (
                    <button
                      key={ch.value}
                      type="button"
                      onClick={() => setPubForm(prev => ({ ...prev, canal: ch.value }))}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border transition-colors ${pubForm.canal === ch.value ? "border-primary bg-primary/10 text-primary" : "border-gray-200 dark:border-white/10 hover:border-primary/50"}`}
                    >
                      <Icon className="h-4 w-4" /> {ch.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Caption */}
            <div>
              <label className="text-sm font-medium block mb-1">Caption</label>
              <textarea
                value={pubForm.caption}
                onChange={e => setPubForm(prev => ({ ...prev, caption: e.target.value }))}
                rows={3}
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Escribe el caption de la publicación..."
              />
            </div>

            {/* Programar fecha */}
            <div>
              <label className="text-sm font-medium block mb-1">Programar (opcional)</label>
              <Input
                type="datetime-local"
                value={pubForm.scheduled_at || ""}
                onChange={e => setPubForm(prev => ({ ...prev, scheduled_at: e.target.value || null }))}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={resetPubForm}>Cancelar</Button>
              <Button size="sm" onClick={savePublication} disabled={pubSaving || !pubForm.caption}>
                {pubSaving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Crear publicación
              </Button>
            </div>
          </div>
        )}

        {/* Publications grid */}
        {pubLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : publications.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>Aún no hay publicaciones en esta campaña</p>
            <p className="text-xs mt-1">Crea al menos una publicación para poder activar la campaña.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {publications.map(pub => (
              <div key={pub.id} className="bg-white/80 dark:bg-white/5 backdrop-blur rounded-xl border border-gray-200 dark:border-white/10 overflow-hidden">
                {/* Media preview */}
                {pub.media_url && pub.tipo_media === "imagen" ? (
                  <img src={pub.media_url} alt="media" className="w-full h-40 object-cover" />
                ) : pub.media_url && pub.tipo_media === "video" ? (
                  <video src={pub.media_url} className="w-full h-40 object-cover" controls />
                ) : (
                  <div className="w-full h-40 bg-gray-100 dark:bg-white/5 flex items-center justify-center">
                    <ImageIcon className="h-10 w-10 text-muted-foreground opacity-40" />
                  </div>
                )}

                <div className="p-3 space-y-2">
                  {/* Canal badge + status */}
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                      {(() => { const ch = CANALES.find(c => c.value === pub.canal); return ch ? <><ch.icon className="h-3 w-3" /> {ch.label}</> : pub.canal })()}
                    </span>
                    {pub.publicada ? (
                      <span className="text-xs text-green-600 flex items-center gap-1"><Check className="h-3 w-3" /> Publicada</span>
                    ) : pub.scheduled_at ? (
                      <span className="text-xs text-amber-600 flex items-center gap-1"><Clock className="h-3 w-3" /> {fmtDateTime(pub.scheduled_at)}</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Borrador</span>
                    )}
                  </div>

                  {/* Caption */}
                  <p className="text-sm line-clamp-2">{pub.caption}</p>

                  {/* Actions */}
                  <div className="flex gap-1 pt-1">
                    {!pub.publicada && (
                      <>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => publishNow(pub.id)}>
                          <Send className="h-3 w-3 mr-1" /> Publicar
                        </Button>
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setSchedulingPub(pub.id); setScheduleDate(pub.scheduled_at?.slice(0, 16) || "") }}>
                          <Clock className="h-3 w-3 mr-1" /> Programar
                        </Button>
                      </>
                    )}
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-red-500 ml-auto" onClick={() => deletePublication(pub.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>

                  {/* Inline schedule form */}
                  {schedulingPub === pub.id && (
                    <div className="flex gap-2 pt-1">
                      <Input
                        type="datetime-local"
                        value={scheduleDate}
                        onChange={e => setScheduleDate(e.target.value)}
                        className="h-8 text-xs"
                      />
                      <Button
                        size="sm"
                        className="h-8 text-xs"
                        disabled={!scheduleDate}
                        onClick={async () => {
                          await schedulePub(pub.id, scheduleDate)
                          setSchedulingPub(null)
                        }}
                      >
                        <Check className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setSchedulingPub(null)}>
                        <XIcon className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  /* ── Campaign list view ──────────────────────────────────── */
  return (
    <div className="space-y-6">
      {errorBanner}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Campañas</h2>
          <p className="text-sm text-muted-foreground">Gestiona tus campañas de marketing y publicaciones.</p>
        </div>
        <Button onClick={startCreate}>
          <Plus className="h-4 w-4 mr-2" /> Nueva campaña
        </Button>
      </div>

      {/* Campaign creation/edit form */}
      {showForm && (
        <div className="bg-white/80 dark:bg-white/5 backdrop-blur rounded-xl border border-gray-200 dark:border-white/10 p-5 space-y-4">
          <h3 className="font-semibold">{editing ? "Editar campaña" : "Nueva campaña"}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-sm font-medium block mb-1">Título</label>
              <Input value={formData.titulo} onChange={e => setFormData(prev => ({ ...prev, titulo: e.target.value }))} placeholder="Campaña de San Valentín" />
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium block mb-1">Mensaje global</label>
              <textarea
                value={formData.mensaje_global}
                onChange={e => setFormData(prev => ({ ...prev, mensaje_global: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-gray-200 dark:border-white/10 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Mensaje de la campaña..."
              />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Segmentación (opcional)</label>
              <Input value={formData.segmentacion || ""} onChange={e => setFormData(prev => ({ ...prev, segmentacion: e.target.value || null }))} placeholder="e.g. todos, vip, nuevos" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Fecha inicio</label>
                <Input type="date" value={formData.fecha_inicio} onChange={e => setFormData(prev => ({ ...prev, fecha_inicio: e.target.value }))} />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Fecha fin</label>
                <Input type="date" value={formData.fecha_fin} onChange={e => setFormData(prev => ({ ...prev, fecha_fin: e.target.value }))} />
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={resetForm}>Cancelar</Button>
            <Button size="sm" onClick={saveCampaign} disabled={saving || !formData.titulo || !formData.fecha_inicio || !formData.fecha_fin}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
              {editing ? "Guardar cambios" : "Crear campaña"}
            </Button>
          </div>
        </div>
      )}

      {/* Campaigns list */}
      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Calendar className="h-16 w-16 mx-auto mb-4 opacity-40" />
          <p className="text-lg font-medium">No hay campañas</p>
          <p className="text-sm mt-1">Crea tu primera campaña de marketing para empezar.</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {campaigns.map(c => (
            <div
              key={c.id}
              className="bg-white/80 dark:bg-white/5 backdrop-blur rounded-xl border border-gray-200 dark:border-white/10 p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => openCampaign(c)}>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold truncate">{c.titulo}</h3>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${c.activa ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"}`}>
                      {c.activa ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{c.mensaje_global}</p>
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> {fmtDate(c.fecha_inicio)} — {fmtDate(c.fecha_fin)}</span>
                    <span className="flex items-center gap-1"><ImageIcon className="h-3 w-3" /> {c.publicaciones_count} publicaciones</span>
                    {c.segmentacion && <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> {c.segmentacion}</span>}
                  </div>
                </div>
                <div className="flex gap-1 ml-3 shrink-0">
                  {!c.activa && c.publicaciones_count > 0 && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-green-600" onClick={() => activateCampaign(c.id)} title="Activar">
                      <Power className="h-4 w-4" />
                    </Button>
                  )}
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => startEdit(c)} title="Editar">
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-500" onClick={() => deleteCampaign(c.id)} title="Eliminar">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => openCampaign(c)} title="Ver detalle">
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
