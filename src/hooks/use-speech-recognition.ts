"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface UseSpeechRecognitionOptions {
  onResult?: (transcript: string) => void
  onError?: (error: string) => void
  continuous?: boolean
  language?: string
}

interface UseSpeechRecognitionReturn {
  isListening: boolean
  isSupported: boolean
  transcript: string
  error: string | null
  startListening: () => void
  stopListening: () => void
  resetTranscript: () => void
}

// Type declarations for Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message?: string
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  isFinal: boolean
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition
    webkitSpeechRecognition: new () => SpeechRecognition
  }
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const { onResult, onError, continuous = false, language = "en-US" } = options

  const [isListening, setIsListening] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [error, setError] = useState<string | null>(null)

  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const onResultRef = useRef(onResult)
  const onErrorRef = useRef(onError)

  // Keep refs in sync
  useEffect(() => {
    onResultRef.current = onResult
    onErrorRef.current = onError
  }, [onResult, onError])

  // Check for browser support and initialize
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition

      if (SpeechRecognitionAPI) {
        setIsSupported(true)
        recognitionRef.current = new SpeechRecognitionAPI()
        recognitionRef.current.continuous = continuous
        recognitionRef.current.interimResults = true
        recognitionRef.current.lang = language

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          let finalTranscript = ""
          let interimTranscript = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              finalTranscript += result[0].transcript
            } else {
              interimTranscript += result[0].transcript
            }
          }

          const currentTranscript = finalTranscript || interimTranscript
          setTranscript(currentTranscript)

          // Call onResult only for final results
          if (finalTranscript && onResultRef.current) {
            onResultRef.current(finalTranscript)
          }
        }

        recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
          let errorMessage = "Speech recognition error"

          switch (event.error) {
            case "no-speech":
              errorMessage = "No speech detected. Please try again."
              break
            case "audio-capture":
              errorMessage = "No microphone found. Please check your device."
              break
            case "not-allowed":
              errorMessage = "Microphone access denied. Please allow microphone access."
              break
            case "network":
              errorMessage = "Network error. Please check your connection."
              break
            case "aborted":
              // User aborted, not an error to display
              setIsListening(false)
              return
            default:
              errorMessage = `Error: ${event.error}`
          }

          setError(errorMessage)
          setIsListening(false)

          if (onErrorRef.current) {
            onErrorRef.current(errorMessage)
          }
        }

        recognitionRef.current.onend = () => {
          setIsListening(false)
        }

        recognitionRef.current.onstart = () => {
          setIsListening(true)
          setError(null)
        }
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort()
      }
    }
  }, [continuous, language])

  const startListening = useCallback(() => {
    if (recognitionRef.current && !isListening) {
      setError(null)
      setTranscript("")
      try {
        recognitionRef.current.start()
      } catch (err) {
        // Recognition might already be running
        console.error("Failed to start recognition:", err)
      }
    }
  }, [isListening])

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop()
    }
  }, [isListening])

  const resetTranscript = useCallback(() => {
    setTranscript("")
    setError(null)
  }, [])

  return {
    isListening,
    isSupported,
    transcript,
    error,
    startListening,
    stopListening,
    resetTranscript,
  }
}
