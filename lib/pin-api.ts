import { getAccessToken, refreshAccessToken, logout, parseDRFError } from "./auth"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ""

async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  let token = getAccessToken()

  if (!token) {
    logout()
    throw new Error("Not authenticated")
  }

  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  })

  if (response.status === 401) {
    // Token expired, try to refresh
    try {
      await refreshAccessToken()
      token = getAccessToken()

      if (!token) {
        logout()
        throw new Error("Not authenticated")
      }

      // Retry the request with the new token
      return fetch(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${token}`,
        },
      })
    } catch (refreshError) {
      logout()
      throw new Error("Session expired")
    }
  }

  return response
}

export interface PinnedSender {
  uid: string
  user: number
  user_email: string
  user_name: string
  sender: string
  order: number
  pinned_at: string
  created_at: string
  updated_at: string
}

export interface PinSenderResponse {
  success: boolean
  message: string
  pinned_sender: PinnedSender
}

export interface UnpinSenderResponse {
  success: boolean
  message: string
}

export interface PinnedSendersResponse {
  pinned_senders: PinnedSender[]
  count: number
  max_allowed: number
}

export async function fetchPinnedSenders(): Promise<PinnedSendersResponse> {
  const response = await authenticatedFetch(`${BASE_URL}/api/payments/betting/user/sms-logs/pinned_senders/`)

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(parseDRFError(errorData))
  }

  return response.json()
}

export async function pinSender(sender: string): Promise<PinSenderResponse> {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/payments/betting/user/sms-logs/pin_sender/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sender }),
    },
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(parseDRFError(errorData))
  }

  return response.json()
}

export async function unpinSender(sender: string): Promise<UnpinSenderResponse> {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/payments/betting/user/sms-logs/unpin_sender/`,
    {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ sender }),
    },
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(parseDRFError(errorData))
  }

  return response.json()
}
