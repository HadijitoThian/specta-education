/**
 * useVisitorTracking — Lightweight visitor behavior tracker
 * 
 * Captures REAL visitor behavior on every page:
 * - Pages visited (path + timestamp)
 * - Time on each page (seconds)
 * - Scroll depth (percentage)
 * - Referrer URL and UTM parameters
 * - Engagement signals (chatbot opened, form interactions, etc.)
 * 
 * Sends data to backend every 30 seconds and on page unload.
 * Uses sessionStorage for session persistence across page navigations.
 */

import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";

// Generate a unique session ID
function generateSessionId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `v_${timestamp}_${random}`;
}

// Generate a simple visitor fingerprint (non-PII)
function generateFingerprint(): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("specta", 2, 2);
  }
  const canvasData = canvas.toDataURL().slice(-50);
  
  const components = [
    navigator.language,
    screen.width + "x" + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 0,
    canvasData,
  ];
  
  // Simple hash
  let hash = 0;
  const str = components.join("|");
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return "fp_" + Math.abs(hash).toString(36);
}

// Parse UTM parameters from URL
function getUtmParams(): { utmSource?: string; utmMedium?: string; utmCampaign?: string } {
  const params = new URLSearchParams(window.location.search);
  return {
    utmSource: params.get("utm_source") || undefined,
    utmMedium: params.get("utm_medium") || undefined,
    utmCampaign: params.get("utm_campaign") || undefined,
  };
}

// Get or create session
function getSession(): { sessionId: string; fingerprint: string; isNew: boolean } {
  const existing = sessionStorage.getItem("specta_visitor_session");
  if (existing) {
    try {
      const parsed = JSON.parse(existing);
      return { ...parsed, isNew: false };
    } catch {}
  }
  
  const session = {
    sessionId: generateSessionId(),
    fingerprint: generateFingerprint(),
  };
  sessionStorage.setItem("specta_visitor_session", JSON.stringify(session));
  return { ...session, isNew: true };
}

interface TrackingPayload {
  sessionId: string;
  visitorFingerprint: string;
  pageVisited: string;
  timeOnPage: number;
  scrollDepth: number;
  referrerUrl?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  chatbotEngaged?: boolean;
  formStarted?: boolean;
  formCompleted?: boolean;
  screenWidth: number;
  screenHeight: number;
  deviceType: string;
}

// Determine device type
function getDeviceType(): string {
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

// Send tracking data to backend (fire-and-forget)
async function sendTrackingData(payload: TrackingPayload): Promise<void> {
  try {
    // Use sendBeacon for reliability on page unload, fetch otherwise
    const data = JSON.stringify(payload);
    
    if (navigator.sendBeacon) {
      const blob = new Blob([data], { type: "application/json" });
      navigator.sendBeacon("/api/track/visitor", blob);
    } else {
      fetch("/api/track/visitor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: data,
        keepalive: true,
      }).catch(() => {}); // Silently fail
    }
  } catch {
    // Silently fail — tracking should never break the user experience
  }
}

/**
 * Main tracking hook — use in App.tsx or a top-level layout component
 */
export function useVisitorTracking() {
  const [location] = useLocation();
  const pageEntryTime = useRef(Date.now());
  const maxScrollDepth = useRef(0);
  const lastSentPage = useRef("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionRef = useRef(getSession());
  const utmRef = useRef(getUtmParams());

  // Track scroll depth
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight > 0) {
        const depth = Math.round((scrollTop / docHeight) * 100);
        if (depth > maxScrollDepth.current) {
          maxScrollDepth.current = depth;
        }
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Build and send the tracking payload
  const sendCurrentPageData = useCallback(() => {
    const timeOnPage = Math.round((Date.now() - pageEntryTime.current) / 1000);
    
    // Don't send if less than 2 seconds on page (bot/bounce filter)
    if (timeOnPage < 2) return;
    
    // Don't track admin pages
    if (location.startsWith("/admin") || location.startsWith("/staff")) return;
    
    // Check if chatbot was engaged (stored in sessionStorage by ChatBot component)
    const chatbotEngaged = sessionStorage.getItem("specta_chatbot_engaged") === "true";
    const formStarted = sessionStorage.getItem("specta_form_started") === "true";
    const formCompleted = sessionStorage.getItem("specta_form_completed") === "true";

    const payload: TrackingPayload = {
      sessionId: sessionRef.current.sessionId,
      visitorFingerprint: sessionRef.current.fingerprint,
      pageVisited: location || "/",
      timeOnPage,
      scrollDepth: maxScrollDepth.current,
      referrerUrl: document.referrer || undefined,
      ...utmRef.current,
      chatbotEngaged,
      formStarted,
      formCompleted,
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      deviceType: getDeviceType(),
    };

    sendTrackingData(payload);
  }, [location]);

  // Track page changes
  useEffect(() => {
    // Send data for previous page before tracking new one
    if (lastSentPage.current && lastSentPage.current !== location) {
      sendCurrentPageData();
    }

    // Reset for new page
    pageEntryTime.current = Date.now();
    maxScrollDepth.current = 0;
    lastSentPage.current = location;

    // Set up periodic sending (every 30 seconds for long-stay pages)
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      sendCurrentPageData();
    }, 30000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [location, sendCurrentPageData]);

  // Send data on page unload
  useEffect(() => {
    const handleUnload = () => {
      sendCurrentPageData();
    };

    window.addEventListener("beforeunload", handleUnload);
    window.addEventListener("pagehide", handleUnload);
    
    return () => {
      window.removeEventListener("beforeunload", handleUnload);
      window.removeEventListener("pagehide", handleUnload);
    };
  }, [sendCurrentPageData]);
}

/**
 * Helper to mark chatbot engagement from ChatBot component
 */
export function markChatbotEngaged() {
  sessionStorage.setItem("specta_chatbot_engaged", "true");
}

/**
 * Helper to mark form interactions
 */
export function markFormStarted() {
  sessionStorage.setItem("specta_form_started", "true");
}

export function markFormCompleted() {
  sessionStorage.setItem("specta_form_completed", "true");
}
