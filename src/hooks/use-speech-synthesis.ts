"use client"

import { useState, useEffect, useCallback, useRef } from "react"

interface UseSpeechSynthesisOptions {
  rate?: number // 0.1 to 10, default 1
  pitch?: number // 0 to 2, default 1
  volume?: number // 0 to 1, default 1
  voice?: SpeechSynthesisVoice | null
  onEnd?: () => void
  onError?: (error: string) => void
}

interface UseSpeechSynthesisReturn {
  speak: (text: string) => void
  cancel: () => void
  pause: () => void
  resume: () => void
  isSpeaking: boolean
  isPaused: boolean
  isSupported: boolean
  voices: SpeechSynthesisVoice[]
  error: string | null
}

export function useSpeechSynthesis(
  options: UseSpeechSynthesisOptions = {}
): UseSpeechSynthesisReturn {
  const { rate = 1, pitch = 1, volume = 1, voice = null, onEnd, onError } = options

  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [isSupported, setIsSupported] = useState(false)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  const [error, setError] = useState<string | null>(null)

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)
  const onEndRef = useRef(onEnd)
  const onErrorRef = useRef(onError)

  // Keep refs in sync
  useEffect(() => {
    onEndRef.current = onEnd
    onErrorRef.current = onError
  }, [onEnd, onError])

  // Check for browser support and load voices
  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setIsSupported(true)

      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices()
        setVoices(availableVoices)
      }

      // Load voices immediately if available
      loadVoices()

      // Chrome loads voices asynchronously
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = loadVoices
      }
    }

    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel()
      }
    }
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!isSupported || !text.trim()) return

      // Cancel any ongoing speech
      window.speechSynthesis.cancel()
      setError(null)

      const utterance = new SpeechSynthesisUtterance(text)
      utteranceRef.current = utterance

      utterance.rate = rate
      utterance.pitch = pitch
      utterance.volume = volume

      // Set voice if specified, otherwise use default
      if (voice) {
        utterance.voice = voice
      } else {
        // Try to find a good English voice
        const englishVoices = voices.filter(
          (v) => v.lang.startsWith("en") && v.localService
        )
        if (englishVoices.length > 0) {
          utterance.voice = englishVoices[0]
        }
      }

      utterance.onstart = () => {
        setIsSpeaking(true)
        setIsPaused(false)
      }

      utterance.onend = () => {
        setIsSpeaking(false)
        setIsPaused(false)
        if (onEndRef.current) {
          onEndRef.current()
        }
      }

      utterance.onerror = (event) => {
        // "interrupted" and "canceled" are not real errors
        if (event.error === "interrupted" || event.error === "canceled") {
          setIsSpeaking(false)
          setIsPaused(false)
          return
        }

        const errorMessage = `Speech synthesis error: ${event.error}`
        setError(errorMessage)
        setIsSpeaking(false)
        setIsPaused(false)

        if (onErrorRef.current) {
          onErrorRef.current(errorMessage)
        }
      }

      utterance.onpause = () => {
        setIsPaused(true)
      }

      utterance.onresume = () => {
        setIsPaused(false)
      }

      window.speechSynthesis.speak(utterance)
    },
    [isSupported, rate, pitch, volume, voice, voices]
  )

  const cancel = useCallback(() => {
    if (isSupported) {
      window.speechSynthesis.cancel()
      setIsSpeaking(false)
      setIsPaused(false)
    }
  }, [isSupported])

  const pause = useCallback(() => {
    if (isSupported && isSpeaking) {
      window.speechSynthesis.pause()
      setIsPaused(true)
    }
  }, [isSupported, isSpeaking])

  const resume = useCallback(() => {
    if (isSupported && isPaused) {
      window.speechSynthesis.resume()
      setIsPaused(false)
    }
  }, [isSupported, isPaused])

  return {
    speak,
    cancel,
    pause,
    resume,
    isSpeaking,
    isPaused,
    isSupported,
    voices,
    error,
  }
}
