import PushNotification from 'react-native-push-notification';
import PushNotificationIOS from '@react-native-community/push-notification-ios';

class NotificationManger {
  configure = (nRegister, onNotification, onOpenNotification) => {
    PushNotification.configure({
      onRegister: function (tokenNotify) {
        console.log('NotificationManger TOKEN:', tokenNotify);
      },
      onNotification: function (notification) {
        console.log('NotificationManger NOTIFICATION:', notification);
        if (notification.data.openedInForeground) {
          notification.userInteraction = true;
        }
        if (notification.userInteraction) {
          onOpenNotification(notification);
        } else {
          this.onNotification(notification);
        }
        // process the notification

        // (required) Called when a remote is received or opened, or local notification is opened
        if (!notification.data.openedInForeground) {
          notification.finish(PushNotificationIOS.FetchResult.NoData);
        } else {
          notification.finish(PushNotificationIOS.FetchResult.NoData);
        }
      },
    });
  };

  _buildIOSNotification = (id, title, mesage, data = {}, options = {}) => {
    return {
      alertAction: options.alertAction || 'view',
      category: options.category || '',
      userInfo: {
        id: id,
        item: data,
      },
    };
  };

  showNotification = (id, title, message, data = {}, options = {}) => {
    this._buildIOSNotification;
    PushNotification.localNotification({
      title: title || '',
      message: message || '',
      playSound: options.playSound || false,
      soundName: options.soundName || 'default',
      userInteraction: false,
      vibrate: false,
    });
  };

  cancelNotification = () => {
    PushNotificationIOS.removeDeliveredNotifications();
  };

  unregister = () => {
    PushNotification.unregister();
  };
}

export const notificationManager = new NotificationManger();
