export const requestNotificationPermission = async (): Promise<boolean> => {
  if (!("Notification" in window)) {
    console.log("Este navegador no soporta notificaciones")
    return false
  }

  if (Notification.permission === "granted") {
    return true
  }

  if (Notification.permission !== "denied") {
    const permission = await Notification.requestPermission()

    if (permission === "granted") {
      // Mostrar notificación de confirmación
      new Notification("Lista Familiar", {
        body: "Notificaciones activadas para tu lista de compras",
        icon: "/icon-192.jpg",
        tag: "permission-granted",
      })
      return true
    }
  }

  return false
}

export const sendNotification = (title: string, options?: NotificationOptions) => {
  if ("Notification" in window && Notification.permission === "granted") {
    return new Notification(title, {
      icon: "/icon-192.jpg",
      ...options,
    })
  }
  return null
}

export const isNotificationSupported = (): boolean => {
  return "Notification" in window
}

export const getNotificationPermission = (): NotificationPermission => {
  if ("Notification" in window) {
    return Notification.permission
  }
  return "default"
}
