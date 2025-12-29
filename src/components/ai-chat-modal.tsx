"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useSession } from "next-auth/react"
import { format } from "date-fns"
import {
  MessageSquare,
  Send,
  Loader2,
  Plus,
  Trash2,
  History,
  Sparkles,
  X,
  ChevronLeft,
  Bot,
  User,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Settings2,
} from "lucide-react"
import { useSpeechRecognition, useSpeechSynthesis } from "@/hooks"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { useChat } from "@ai-sdk/react"
import { TextStreamChatTransport } from "ai"
import { Check, XCircle, Edit3 } from "lucide-react"

interface ChatConversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

interface ChatMessage {
  id: string
  conversation_id: string
  role: "user" | "assistant" | "system"
  content: string
  created_at: string
}

interface AIChatModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AIChatModal({ open, onOpenChange }: AIChatModalProps) {
  const { data: session } = useSession()
  
  // Conversation state
  const [conversations, setConversations] = useState<ChatConversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [savedMessages, setSavedMessages] = useState<ChatMessage[]>([])
  const [isLoadingHistory, setIsLoadingHistory] = useState(false)
  const [showHistory, setShowHistory] = useState(true)
  const [deleteConversationId, setDeleteConversationId] = useState<string | null>(null)
  const [isNewConversation, setIsNewConversation] = useState(false)
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // Voice input/output state
  const [voiceOutputEnabled, setVoiceOutputEnabled] = useState(false)
  const [autoSpeak, setAutoSpeak] = useState(false)

  // Speech recognition hook
  const {
    isListening,
    isSupported: isSpeechRecognitionSupported,
    transcript,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition({
    onResult: (result) => {
      if (inputRef.current) {
        inputRef.current.value = result
      }
    },
  })

  // Speech synthesis hook
  const {
    speak,
    cancel: cancelSpeech,
    isSpeaking,
    isSupported: isSpeechSynthesisSupported,
  } = useSpeechSynthesis({
    rate: 1,
    pitch: 1,
  })

  // Use refs to track current values for the onFinish callback
  const currentConversationIdRef = useRef<string | null>(null)
  const isNewConversationRef = useRef(false)
  const autoSpeakRef = useRef(false)
  const speakRef = useRef<(text: string) => void>(() => {})

  // Keep refs in sync with state
  useEffect(() => {
    currentConversationIdRef.current = currentConversationId
  }, [currentConversationId])

  useEffect(() => {
    isNewConversationRef.current = isNewConversation
  }, [isNewConversation])

  useEffect(() => {
    autoSpeakRef.current = autoSpeak
  }, [autoSpeak])

  useEffect(() => {
    speakRef.current = speak
  }, [speak])

  // Update input field with transcript while listening
  useEffect(() => {
    if (isListening && transcript && inputRef.current) {
      inputRef.current.value = transcript
    }
  }, [isListening, transcript])
  
  // User info from session
  const userImage = session?.user?.image || null
  const userName = session?.user?.name || "User"

  // Save message to database helper - defined before useChat
  const saveMessageToDbRef = useRef<(conversationId: string, role: string, content: string) => Promise<void>>()

  // AI Chat hook
  const chatTransport = new TextStreamChatTransport({ api: "/api/chat" })
  const { messages, sendMessage, status, setMessages } = useChat({
    transport: chatTransport,
    onFinish: async ({ message }) => {
      // Save assistant message to database when it finishes
      const convId = currentConversationIdRef.current
      if (convId && message.role === "assistant") {
        const content = message.parts
          ?.filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("") || ""

        // Only save if there's actual content
        if (content.trim()) {
          if (saveMessageToDbRef.current) {
            await saveMessageToDbRef.current(convId, "assistant", content)
          }

          // Update conversation title if it's the first exchange
          if (isNewConversationRef.current) {
            await updateConversationTitleRef.current?.(convId, content)
            setIsNewConversation(false)
          }

          // Auto-speak the response if enabled
          if (autoSpeakRef.current && speakRef.current) {
            speakRef.current(content)
          }
        }
      }
    },
  })
  
  const isChatLoading = status === "streaming" || status === "submitted"

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, savedMessages])

  // Focus input when modal opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  // Fetch conversations on mount
  const fetchConversations = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations")
      if (res.ok) {
        const data = await res.json()
        setConversations(data)
      }
    } catch (error) {
      console.error("Failed to fetch conversations:", error)
    }
  }, [])

  useEffect(() => {
    if (open) {
      fetchConversations()
    }
  }, [open, fetchConversations])

  // Load conversation messages
  const loadConversation = async (conversationId: string) => {
    setIsLoadingHistory(true)
    setCurrentConversationId(conversationId)
    setMessages([]) // Clear current chat messages
    
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}/messages`)
      if (res.ok) {
        const data = await res.json()
        setSavedMessages(data)
      }
    } catch (error) {
      console.error("Failed to load conversation:", error)
    } finally {
      setIsLoadingHistory(false)
    }
  }

  // Start new conversation
  const startNewConversation = async () => {
    setCurrentConversationId(null)
    setSavedMessages([])
    setMessages([])
    setIsNewConversation(false)
    inputRef.current?.focus()
  }

  // Save message to database (doesn't update local state - that comes from useChat)
  const saveMessageToDb = useCallback(async (conversationId: string, role: string, content: string) => {
    if (!content.trim()) return // Don't save empty messages
    
    try {
      await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, content }),
      })
      
      // Update conversation's updated_at in the list
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, updated_at: new Date().toISOString() }
            : c
        ).sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
      )
    } catch (error) {
      console.error("Failed to save message:", error)
    }
  }, [])
  
  // Keep the ref in sync
  useEffect(() => {
    saveMessageToDbRef.current = saveMessageToDb
  }, [saveMessageToDb])

  // Update conversation title based on first message
  const updateConversationTitle = useCallback(async (conversationId: string, assistantResponse: string) => {
    // Generate a title from the first user message or response
    const title = assistantResponse.slice(0, 50)
    
    try {
      await fetch(`/api/chat/conversations/${conversationId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title + (title.length >= 50 ? "..." : "") }),
      })
      
      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? { ...c, title: title + (title.length >= 50 ? "..." : "") }
            : c
        )
      )
    } catch (error) {
      console.error("Failed to update title:", error)
    }
  }, [])
  
  // Ref for updateConversationTitle
  const updateConversationTitleRef = useRef<(conversationId: string, content: string) => Promise<void>>()
  
  useEffect(() => {
    updateConversationTitleRef.current = updateConversationTitle
  }, [updateConversationTitle])

  // Delete conversation
  const deleteConversation = async (conversationId: string) => {
    try {
      const res = await fetch(`/api/chat/conversations/${conversationId}`, {
        method: "DELETE",
      })
      
      if (res.ok) {
        setConversations((prev) => prev.filter((c) => c.id !== conversationId))
        if (currentConversationId === conversationId) {
          setCurrentConversationId(null)
          setSavedMessages([])
          setMessages([])
        }
      }
    } catch (error) {
      console.error("Failed to delete conversation:", error)
    } finally {
      setDeleteConversationId(null)
    }
  }

  // Handle voice input toggle
  const handleVoiceToggle = useCallback(() => {
    if (isListening) {
      stopListening()
    } else {
      resetTranscript()
      startListening()
    }
  }, [isListening, startListening, stopListening, resetTranscript])

  // Handle speak message
  const handleSpeakMessage = useCallback(
    (content: string) => {
      if (isSpeaking) {
        cancelSpeech()
      } else {
        speak(content)
      }
    },
    [isSpeaking, cancelSpeech, speak]
  )

  // Handle send message
  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    const input = inputRef.current?.value.trim()
    if (!input || isChatLoading) return

    // Stop listening if active
    if (isListening) {
      stopListening()
    }
    resetTranscript()

    let conversationId = currentConversationId

    // Create conversation if none exists
    if (!conversationId) {
      try {
        const res = await fetch("/api/chat/conversations", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: input.slice(0, 50) + (input.length >= 50 ? "..." : "") }),
        })
        
        if (res.ok) {
          const conversation = await res.json()
          setConversations((prev) => [conversation, ...prev])
          setCurrentConversationId(conversation.id)
          conversationId = conversation.id
          setIsNewConversation(true)
        } else {
          console.error("Failed to create conversation")
          return
        }
      } catch (error) {
        console.error("Failed to create conversation:", error)
        return
      }
    }

    // Save user message to database
    if (conversationId) {
      await saveMessageToDb(conversationId, "user", input)
    }

    // Clear input and send to AI
    if (inputRef.current) inputRef.current.value = ""
    sendMessage({ parts: [{ type: "text", text: input }] })
  }

  // Build display messages
  // When viewing history (savedMessages), show those
  // When in active chat, show messages from useChat hook
  const displayMessages = savedMessages.length > 0 && messages.length === 0
    ? savedMessages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.content,
      }))
    : messages.map((m) => ({
        id: m.id,
        role: m.role as "user" | "assistant",
        content: m.parts
          ?.filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("") || "",
      })).filter((m) => m.content.trim() !== "") // Filter out empty messages

  // Detect if quick reply suggestions should be shown
  const lastMessage = displayMessages[displayMessages.length - 1]
  const showQuickReplies = lastMessage?.role === "assistant" && !isChatLoading && (
    lastMessage.content.toLowerCase().includes("does that look correct") ||
    lastMessage.content.toLowerCase().includes("is that correct") ||
    lastMessage.content.toLowerCase().includes("is that right") ||
    lastMessage.content.toLowerCase().includes("would you like me to") ||
    lastMessage.content.toLowerCase().includes("shall i") ||
    lastMessage.content.toLowerCase().includes("want me to") ||
    lastMessage.content.toLowerCase().includes("should i") ||
    lastMessage.content.toLowerCase().includes("can i proceed") ||
    lastMessage.content.toLowerCase().includes("ready to add") ||
    lastMessage.content.toLowerCase().includes("confirm") ||
    lastMessage.content.endsWith("?")
  )

  // Detect if it's a yes/no question vs a detail question
  const isYesNoQuestion = lastMessage?.role === "assistant" && (
    lastMessage.content.toLowerCase().includes("does that look correct") ||
    lastMessage.content.toLowerCase().includes("is that correct") ||
    lastMessage.content.toLowerCase().includes("is that right") ||
    lastMessage.content.toLowerCase().includes("would you like me to") ||
    lastMessage.content.toLowerCase().includes("shall i") ||
    lastMessage.content.toLowerCase().includes("want me to") ||
    lastMessage.content.toLowerCase().includes("should i") ||
    lastMessage.content.toLowerCase().includes("can i proceed") ||
    lastMessage.content.toLowerCase().includes("are you sure")
  )

  // Quick reply handler
  const handleQuickReply = useCallback((reply: string) => {
    if (inputRef.current) {
      inputRef.current.value = reply
    }
    // Submit the form programmatically
    const form = inputRef.current?.closest("form")
    if (form) {
      form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }))
    }
  }, [])

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-5xl h-[80vh] p-0 gap-0" hideCloseButton>
          <div className="flex h-full overflow-hidden">
            {/* History Sidebar */}
            <div
              className={cn(
                "border-r bg-muted/30 flex flex-col transition-all duration-300 overflow-hidden",
                showHistory ? "w-72 min-h-0" : "w-0"
              )}
            >
              <div className="p-4 border-b flex items-center justify-between shrink-0">
                <h3 className="font-semibold flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Chat History
                </h3>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={startNewConversation}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              
              <ScrollArea className="flex-1 min-h-0">
                <div className="p-2 space-y-1">
                  {conversations.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">
                      No conversations yet
                    </p>
                  ) : (
                    conversations.map((conv) => (
                      <div
                        key={conv.id}
                        className={cn(
                          "group flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                          currentConversationId === conv.id
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        )}
                        onClick={() => loadConversation(conv.id)}
                      >
                        <MessageSquare className="h-4 w-4 shrink-0" />
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-sm font-medium truncate max-w-[160px]">
                            {conv.title.length > 20
                              ? conv.title.slice(0, 20) + "..."
                              : conv.title}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {format(new Date(conv.updated_at), "MMM d, h:mm a")}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0 opacity-100"
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeleteConversationId(conv.id)
                          }}
                        >
                          <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 min-h-0 overflow-hidden">
              <DialogHeader className="p-4 border-b shrink-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 md:hidden"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      {showHistory ? <X className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 hidden md:flex"
                      onClick={() => setShowHistory(!showHistory)}
                    >
                      <History className="h-4 w-4" />
                    </Button>
                    <DialogTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      AI Finance Advisor
                    </DialogTitle>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Voice Settings */}
                    {(isSpeechRecognitionSupported || isSpeechSynthesisSupported) && (
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Settings2 className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64" align="end">
                          <div className="space-y-4">
                            <h4 className="font-medium text-sm">Voice Settings</h4>
                            {isSpeechSynthesisSupported && (
                              <>
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="voice-output" className="text-sm">
                                    Enable voice output
                                  </Label>
                                  <Switch
                                    id="voice-output"
                                    checked={voiceOutputEnabled}
                                    onCheckedChange={setVoiceOutputEnabled}
                                  />
                                </div>
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="auto-speak" className="text-sm">
                                    Auto-speak responses
                                  </Label>
                                  <Switch
                                    id="auto-speak"
                                    checked={autoSpeak}
                                    onCheckedChange={setAutoSpeak}
                                    disabled={!voiceOutputEnabled}
                                  />
                                </div>
                              </>
                            )}
                            {!isSpeechRecognitionSupported && (
                              <p className="text-xs text-muted-foreground">
                                Voice input not supported in this browser.
                              </p>
                            )}
                            {!isSpeechSynthesisSupported && (
                              <p className="text-xs text-muted-foreground">
                                Voice output not supported in this browser.
                              </p>
                            )}
                          </div>
                        </PopoverContent>
                      </Popover>
                    )}
                    {currentConversationId && (
                      <Button variant="outline" size="sm" onClick={startNewConversation}>
                        <Plus className="h-4 w-4 mr-1" />
                        New Chat
                      </Button>
                    )}
                    <DialogClose asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <X className="h-4 w-4" />
                        <span className="sr-only">Close</span>
                      </Button>
                    </DialogClose>
                  </div>
                </div>
              </DialogHeader>

              {/* Messages */}
              <ScrollArea className="flex-1 min-h-0 p-4">
                {isLoadingHistory ? (
                  <div className="flex items-center justify-center h-full">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : displayMessages.length === 0 && !isChatLoading ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <div className="p-4 rounded-full bg-primary/10 mb-4">
                      <Sparkles className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">How can I help you today?</h3>
                    <p className="text-sm text-muted-foreground max-w-sm mb-4">
                      I can help you add transactions, check your spending, track your budget, and more.
                    </p>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {[
                        "Add $50 for groceries",
                        "How much did I spend this month?",
                        "What's my budget status?",
                      ].map((suggestion) => (
                        <Button
                          key={suggestion}
                          variant="outline"
                          size="sm"
                          className="text-xs"
                          onClick={() => {
                            if (inputRef.current) {
                              inputRef.current.value = suggestion
                              inputRef.current.focus()
                            }
                          }}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {displayMessages.map((msg) => (
                      <div
                        key={msg.id}
                        className={cn(
                          "flex gap-3 group",
                          msg.role === "user" ? "justify-end" : "justify-start"
                        )}
                      >
                        {msg.role !== "user" && (
                          <div className="p-2 rounded-full bg-primary/10 h-8 w-8 flex items-center justify-center shrink-0">
                            <Bot className="h-4 w-4 text-primary" />
                          </div>
                        )}
                        <div
                          className={cn(
                            "max-w-[80%] p-3 rounded-lg relative",
                            msg.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          )}
                        >
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                          {/* Speak button for assistant messages */}
                          {msg.role !== "user" && voiceOutputEnabled && isSpeechSynthesisSupported && (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute -bottom-3 -right-3 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity bg-background shadow-sm border"
                                    onClick={() => handleSpeakMessage(msg.content)}
                                  >
                                    {isSpeaking ? (
                                      <Square className="h-3 w-3" />
                                    ) : (
                                      <Volume2 className="h-3 w-3" />
                                    )}
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  {isSpeaking ? "Stop speaking" : "Read aloud"}
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                        {msg.role === "user" && (
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={userImage || undefined} alt={userName} />
                            <AvatarFallback>
                              <User className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                        )}
                      </div>
                    ))}
                    {/* Quick Reply Suggestions */}
                    {showQuickReplies && !isChatLoading && displayMessages.length > 0 && (
                      <div className="flex flex-wrap gap-2 ml-11 mt-2">
                        {isYesNoQuestion ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs gap-1 border-green-200 hover:border-green-400 hover:bg-green-50 dark:border-green-800 dark:hover:border-green-600 dark:hover:bg-green-950"
                              onClick={() => handleQuickReply("Yes, add it")}
                            >
                              <Check className="h-3 w-3 text-green-600" />
                              Yes, add it
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs gap-1 border-red-200 hover:border-red-400 hover:bg-red-50 dark:border-red-800 dark:hover:border-red-600 dark:hover:bg-red-950"
                              onClick={() => handleQuickReply("No, cancel")}
                            >
                              <XCircle className="h-3 w-3 text-red-600" />
                              No, cancel
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs gap-1"
                              onClick={() => handleQuickReply("Let me change the details")}
                            >
                              <Edit3 className="h-3 w-3" />
                              Edit details
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleQuickReply("Yes")}
                            >
                              Yes
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleQuickReply("No")}
                            >
                              No
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-xs"
                              onClick={() => handleQuickReply("Tell me more")}
                            >
                              Tell me more
                            </Button>
                          </>
                        )}
                      </div>
                    )}
                    {isChatLoading && (
                      <div className="flex gap-3">
                        <div className="p-2 rounded-full bg-primary/10 h-8 w-8 flex items-center justify-center shrink-0">
                          <Bot className="h-4 w-4 text-primary" />
                        </div>
                        <div className="bg-muted p-3 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Thinking...</span>
                          </div>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t shrink-0">
                {/* Voice input error message */}
                {speechError && (
                  <div className="mb-2 p-2 text-xs text-destructive bg-destructive/10 rounded-md">
                    {speechError}
                  </div>
                )}
                {/* Listening indicator */}
                {isListening && (
                  <div className="mb-2 flex items-center gap-2 text-xs text-primary">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                    </span>
                    Listening... {transcript && `"${transcript}"`}
                  </div>
                )}
                <form onSubmit={handleSend} className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder={isListening ? "Listening..." : "Ask about your finances or add a transaction..."}
                    className={cn("flex-1", isListening && "border-primary")}
                    disabled={isChatLoading}
                  />
                  {/* Microphone button */}
                  {isSpeechRecognitionSupported && (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant={isListening ? "destructive" : "outline"}
                            size="icon"
                            onClick={handleVoiceToggle}
                            disabled={isChatLoading}
                          >
                            {isListening ? (
                              <MicOff className="h-4 w-4" />
                            ) : (
                              <Mic className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {isListening ? "Stop listening" : "Voice input"}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <Button type="submit" disabled={isChatLoading}>
                    {isChatLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </form>
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  AI can make mistakes. Always verify financial information.
                </p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteConversationId} onOpenChange={() => setDeleteConversationId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConversationId && deleteConversation(deleteConversationId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
