"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { toast } from "sonner"
import {
  Settings,
  Volume2,
  Brain,
  Bell,
  Download,
  Upload,
  Trash2,
  Plus,
  Save,
  RefreshCw,
  Sparkles,
  BookOpen,
  X,
} from "lucide-react"
import type { AILearningRule, AIMemory } from "@/lib/validators/ai-features"

interface AISettings {
  ai_voice_enabled: boolean
  ai_auto_speak: boolean
  ai_personality: "formal" | "casual" | "friendly"
  ai_response_length: "brief" | "detailed" | "auto"
  weekly_summary_enabled: boolean
  weekly_summary_day: number
  monthly_report_enabled: boolean
  proactive_notifications_enabled: boolean
  ai_language: string
}

export function AISettingsPanel() {
  const [settings, setSettings] = useState<AISettings>({
    ai_voice_enabled: false,
    ai_auto_speak: false,
    ai_personality: "friendly",
    ai_response_length: "auto",
    weekly_summary_enabled: true,
    weekly_summary_day: 1,
    monthly_report_enabled: true,
    proactive_notifications_enabled: true,
    ai_language: "en",
  })
  const [learningRules, setLearningRules] = useState<AILearningRule[]>([])
  const [memories, setMemories] = useState<AIMemory[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [newRule, setNewRule] = useState("")

  const fetchData = async () => {
    setLoading(true)
    try {
      const [profileRes, rulesRes, memoriesRes] = await Promise.all([
        fetch("/api/profile"),
        fetch("/api/ai-learning"),
        fetch("/api/ai-memory"),
      ])

      const profile = await profileRes.json()
      const rules = await rulesRes.json()
      const mems = await memoriesRes.json()

      if (profile) {
        setSettings({
          ai_voice_enabled: profile.ai_voice_enabled ?? false,
          ai_auto_speak: profile.ai_auto_speak ?? false,
          ai_personality: profile.ai_personality ?? "friendly",
          ai_response_length: profile.ai_response_length ?? "auto",
          weekly_summary_enabled: profile.weekly_summary_enabled ?? true,
          weekly_summary_day: profile.weekly_summary_day ?? 1,
          monthly_report_enabled: profile.monthly_report_enabled ?? true,
          proactive_notifications_enabled: profile.proactive_notifications_enabled ?? true,
          ai_language: profile.ai_language ?? "en",
        })
      }
      if (rules.rules) setLearningRules(rules.rules)
      if (mems.memories) setMemories(mems.memories)
    } catch (err) {
      console.error("Failed to fetch AI settings:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    try {
      await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      })
      toast.success("Your AI preferences have been updated.")
    } catch (err) {
      toast.error("Failed to save settings")
    } finally {
      setSaving(false)
    }
  }

  const teachAI = async () => {
    if (!newRule.trim()) return
    try {
      const res = await fetch("/api/ai-learning?action=teach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instruction: newRule }),
      })
      const data = await res.json()
      if (data.rule) {
        setLearningRules([data.rule, ...learningRules])
        setNewRule("")
        toast.success(data.message || "Rule learned!")
      } else {
        toast.error(data.hint || "Couldn't understand. Try a different format.")
      }
    } catch (err) {
      toast.error("Failed to teach AI")
    }
  }

  const deleteRule = async (id: string) => {
    try {
      await fetch(`/api/ai-learning?id=${id}`, { method: "DELETE" })
      setLearningRules(learningRules.filter((r) => r.id !== id))
      toast.success("Rule deleted")
    } catch (err) {
      toast.error("Failed to delete rule")
    }
  }

  const deleteMemory = async (id: string) => {
    try {
      await fetch(`/api/ai-memory?id=${id}`, { method: "DELETE" })
      setMemories(memories.filter((m) => m.id !== id))
      toast.success("Memory cleared")
    } catch (err) {
      toast.error("Failed to clear memory")
    }
  }

  const clearAllMemories = async () => {
    if (!confirm("Are you sure you want to clear all AI memories?")) return
    try {
      for (const mem of memories) {
        await fetch(`/api/ai-memory?id=${mem.id}`, { method: "DELETE" })
      }
      setMemories([])
      toast.success("All memories cleared")
    } catch (err) {
      toast.error("Failed to clear memories")
    }
  }

  const exportData = async () => {
    try {
      const res = await fetch("/api/ai-export?format=download")
      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `pocket-pilot-ai-export-${new Date().toISOString().split("T")[0]}.json`
      a.click()
      window.URL.revokeObjectURL(url)
      toast.success("AI data exported successfully")
    } catch (err) {
      toast.error("Failed to export data")
    }
  }

  const importData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)
      const res = await fetch("/api/ai-export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })
      const result = await res.json()
      if (result.success) {
        toast.success(result.summary || "Import complete")
        fetchData()
      } else {
        toast.error(result.error || "Import failed")
      }
    } catch (err) {
      toast.error("Invalid import file")
    }
  }

  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]

  return (
    <div className="space-y-6">
      {/* Voice Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Volume2 className="h-5 w-5" />
            Voice Settings
          </CardTitle>
          <CardDescription>Configure AI voice input and output</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Voice Output</Label>
              <p className="text-sm text-muted-foreground">AI will speak responses aloud</p>
            </div>
            <Switch
              checked={settings.ai_voice_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, ai_voice_enabled: v })}
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label>Auto-speak Responses</Label>
              <p className="text-sm text-muted-foreground">Automatically speak new messages</p>
            </div>
            <Switch
              checked={settings.ai_auto_speak}
              onCheckedChange={(v) => setSettings({ ...settings, ai_auto_speak: v })}
              disabled={!settings.ai_voice_enabled}
            />
          </div>
        </CardContent>
      </Card>

      {/* AI Personality */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Personality
          </CardTitle>
          <CardDescription>Customize how the AI communicates</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Communication Style</Label>
            <Select
              value={settings.ai_personality}
              onValueChange={(v) => setSettings({ ...settings, ai_personality: v as AISettings["ai_personality"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="formal">Formal - Professional and concise</SelectItem>
                <SelectItem value="casual">Casual - Relaxed and conversational</SelectItem>
                <SelectItem value="friendly">Friendly - Warm and encouraging</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Response Length</Label>
            <Select
              value={settings.ai_response_length}
              onValueChange={(v) => setSettings({ ...settings, ai_response_length: v as AISettings["ai_response_length"] })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="brief">Brief - Short, to-the-point responses</SelectItem>
                <SelectItem value="detailed">Detailed - Comprehensive explanations</SelectItem>
                <SelectItem value="auto">Auto - Context-appropriate length</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications & Summaries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Notifications & Summaries
          </CardTitle>
          <CardDescription>Configure proactive AI features</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Proactive Notifications</Label>
              <p className="text-sm text-muted-foreground">AI alerts about spending, budgets, bills</p>
            </div>
            <Switch
              checked={settings.proactive_notifications_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, proactive_notifications_enabled: v })}
            />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Weekly Summaries</Label>
              <p className="text-sm text-muted-foreground">AI-generated weekly financial digest</p>
            </div>
            <Switch
              checked={settings.weekly_summary_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, weekly_summary_enabled: v })}
            />
          </div>
          {settings.weekly_summary_enabled && (
            <div className="space-y-2 pl-4">
              <Label>Generate On</Label>
              <Select
                value={String(settings.weekly_summary_day)}
                onValueChange={(v) => setSettings({ ...settings, weekly_summary_day: parseInt(v) })}
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {dayNames.map((day, i) => (
                    <SelectItem key={i} value={String(i)}>{day}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <Label>Monthly Reports</Label>
              <p className="text-sm text-muted-foreground">Comprehensive month-end analysis</p>
            </div>
            <Switch
              checked={settings.monthly_report_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, monthly_report_enabled: v })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Learning Rules */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            AI Learning Rules
          </CardTitle>
          <CardDescription>Teach the AI your preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="e.g., 'When I buy from Starbucks, categorize as Dining Out'"
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && teachAI()}
            />
            <Button onClick={teachAI}>
              <Plus className="h-4 w-4 mr-1" />
              Teach
            </Button>
          </div>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {learningRules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{rule.rule_type}</Badge>
                      <span className="font-medium">{rule.pattern}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {JSON.stringify(rule.action)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteRule(rule.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {learningRules.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No learning rules yet. Teach the AI your preferences above.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* AI Memory */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                AI Memory
              </CardTitle>
              <CardDescription>What the AI remembers about you</CardDescription>
            </div>
            {memories.length > 0 && (
              <Button variant="outline" size="sm" onClick={clearAllMemories}>
                <Trash2 className="h-4 w-4 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[200px]">
            <div className="space-y-2">
              {memories.map((mem) => (
                <div key={mem.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{mem.memory_type}</Badge>
                      <span className="font-medium">{mem.key}</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {typeof mem.value === "object" ? JSON.stringify(mem.value) : String(mem.value)}
                    </p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => deleteMemory(mem.id)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {memories.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  No memories stored. The AI will learn your preferences over time.
                </p>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Export/Import */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Data Management
          </CardTitle>
          <CardDescription>Export or import your AI preferences</CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4">
          <Button variant="outline" onClick={exportData}>
            <Download className="h-4 w-4 mr-2" />
            Export AI Data
          </Button>
          <div>
            <input
              type="file"
              accept=".json"
              onChange={importData}
              className="hidden"
              id="import-file"
            />
            <Button variant="outline" asChild>
              <label htmlFor="import-file" className="cursor-pointer">
                <Upload className="h-4 w-4 mr-2" />
                Import AI Data
              </label>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          Save Settings
        </Button>
      </div>
    </div>
  )
}
