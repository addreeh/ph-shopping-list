import { createClient } from "@/lib/supabase/client"

export interface User {
  id: string
  username: string
  display_name: string
}

export interface AuthResponse {
  user: User | null
  error: string | null
}

class AuthManager {
  private user: User | null = null
  private sessionToken: string | null = null

  constructor() {
    // Load session from localStorage on initialization
    if (typeof window !== "undefined") {
      this.sessionToken = localStorage.getItem("session_token")
      const userData = localStorage.getItem("user_data")
      if (userData) {
        try {
          this.user = JSON.parse(userData)
        } catch (e) {
          this.clearSession()
        }
      }
    }
  }

  async login(username: string, password: string): Promise<AuthResponse> {
    try {
      const supabase = createClient()

      const { data, error } = await supabase.rpc("authenticate_user", {
        p_username: username,
        p_password: password,
      })

      if (error) {
        return { user: null, error: error.message }
      }

      if (data && data.length > 0) {
        const userData = data[0]
        this.user = {
          id: userData.user_id,
          username: userData.username,
          display_name: userData.display_name,
        }
        this.sessionToken = userData.session_token

        // Store in localStorage
        localStorage.setItem("session_token", this.sessionToken)
        localStorage.setItem("user_data", JSON.stringify(this.user))

        return { user: this.user, error: null }
      }

      return { user: null, error: "Credenciales incorrectas" }
    } catch (error) {
      return { user: null, error: "Error de conexión" }
    }
  }

  async register(username: string, displayName: string, password: string): Promise<AuthResponse> {
    try {
      const supabase = createClient()

      const { data, error } = await supabase.rpc("register_user", {
        p_username: username,
        p_display_name: displayName,
        p_password: password,
      })

      if (error) {
        if (error.message.includes("duplicate key")) {
          return { user: null, error: "El nombre de usuario ya existe" }
        }
        return { user: null, error: error.message }
      }

      if (data && data.length > 0) {
        const userData = data[0]
        this.user = {
          id: userData.user_id,
          username: userData.username,
          display_name: userData.display_name,
        }
        this.sessionToken = userData.session_token

        // Store in localStorage
        localStorage.setItem("session_token", this.sessionToken)
        localStorage.setItem("user_data", JSON.stringify(this.user))

        return { user: this.user, error: null }
      }

      return { user: null, error: "Error al crear la cuenta" }
    } catch (error) {
      return { user: null, error: "Error de conexión" }
    }
  }

  async logout(): Promise<void> {
    if (this.sessionToken) {
      try {
        const supabase = createClient()
        await supabase.rpc("logout_user", {
          p_session_token: this.sessionToken,
        })
      } catch (error) {
        console.error("Error logging out:", error)
      }
    }

    this.clearSession()
  }

  async getCurrentUser(): Promise<User | null> {
    if (!this.sessionToken) {
      return null
    }

    try {
      const supabase = createClient()
      const { data, error } = await supabase.rpc("get_user_from_session", {
        p_session_token: this.sessionToken,
      })

      if (error || !data || data.length === 0) {
        this.clearSession()
        return null
      }

      const userData = data[0]
      this.user = {
        id: userData.user_id,
        username: userData.username,
        display_name: userData.display_name,
      }

      return this.user
    } catch (error) {
      this.clearSession()
      return null
    }
  }

  getUser(): User | null {
    return this.user
  }

  getSessionToken(): string | null {
    return this.sessionToken
  }

  isAuthenticated(): boolean {
    return this.user !== null && this.sessionToken !== null
  }

  private clearSession(): void {
    this.user = null
    this.sessionToken = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("session_token")
      localStorage.removeItem("user_data")
    }
  }
}

export const authManager = new AuthManager()
