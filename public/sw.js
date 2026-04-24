// 1. 푸시 알림 수신 이벤트
self.addEventListener("push", function (event) {
  if (event.data) {
    const data = event.data.json();

    const options = {
      body: data.body,
      icon: "/icons/icon-192x192.png", // 앱 아이콘 경로
      badge: "/icons/badge-72x72.png", // 상태표시줄 작은 아이콘
      vibrate: [100, 50, 100],
      data: {
        url: data.url || "/", // 알림 클릭 시 이동할 주소
      },
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// 2. 알림 클릭 시 페이지 이동 이벤트
self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data.url));
});
