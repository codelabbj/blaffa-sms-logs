import { authenticatedFetch } from "./api"
import { parseDRFError } from "./auth"

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || ""

export interface FcmLog {
  uid: string
  device: string
  device_id: string
  device_name?: string
  title: string
  body: string
  data: any
  associated_transaction?: string
  is_processed: boolean
  package_name: string
  external_id: string
  status: "pending" | "approved" | "no_order" | "refunded"
  status_display: string
  status_changed_at?: string
  status_changed_by?: number
  status_changed_by_name?: string
  can_change_status: boolean
  created_at: string
}

export interface FcmLogsResponse {
  count: number
  next: string | null
  previous: string | null
  results: FcmLog[]
}

export interface PackageStat {
  package_name: string
  count: number
  pending_count: number
  processed_count: number
  ignored_count: number
  unread_count: number
}

export interface UniquePackagesResponse {
  packages: string[]
  total: number
  stats: PackageStat[]
}

export interface UniquePackage {
  package_name: string
  original_package_name: string
  count: number
  pending_count: number
  unread_count: number
  latest_message_at?: string
}

export async function fetchFcmLogs(params: {
  page?: number
  page_size?: number
  status?: string
  device_uid?: string
  search?: string
  ordering?: string
  date_from?: string
  date_to?: string
  package_name?: string
}): Promise<FcmLogsResponse> {
  console.log("🔍 fetchFcmLogs called with params:", params)
  const queryParams = new URLSearchParams()

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") {
      queryParams.append(key, value.toString())
    }
  })

  const url = `${BASE_URL}/api/payments/betting/user/fcm-logs/?${queryParams.toString()}`
  console.log("📡 fetchFcmLogs making request to:", url)
  const response = await authenticatedFetch(url)
  console.log("📡 fetchFcmLogs response status:", response.status)

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(parseDRFError(errorData))
  }

  return response.json()
}

export async function fetchUniquePackages(): Promise<UniquePackage[]> {
  console.log("🔍 fetchUniquePackages called - making API request")
  const response = await authenticatedFetch(`${BASE_URL}/api/payments/betting/user/fcm-logs/unique_packages/`)
  console.log("📡 fetchUniquePackages response status:", response.status)

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(parseDRFError(errorData))
  }

  const data: UniquePackagesResponse = await response.json()

  // Transform the API response to match our component expectations
  return data.stats
    .filter(stat => stat.count > 0)
    .map(stat => {
      const displayNames: Record<string, string> = {
        "com.orange.bf.om_merchant": "Orange bf",
        "com.wave.business": "Wave Business",
        "com.wave.personal": "Wave Personal",
        "mtnft.momo.groupbiz": "MTN MoMo",
      };
      
      return {
        package_name: displayNames[stat.package_name] || stat.package_name,
        original_package_name: stat.package_name,
        count: stat.count,
        pending_count: stat.pending_count,
        unread_count: stat.unread_count,
        latest_message_at: (stat as any).latest_message_at || new Date(0).toISOString()
      };
    })
}

export async function updateFcmStatus(fcmLogUid: string, status: "approved" | "no_order" | "refunded"): Promise<FcmLog> {
  const response = await authenticatedFetch(
    `${BASE_URL}/api/payments/betting/user/fcm-logs/${fcmLogUid}/update_status/`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status }),
    },
  )

  if (!response.ok) {
    const errorData = await response.json().catch(() => null)
    throw new Error(parseDRFError(errorData))
  }

  return response.json()
}
