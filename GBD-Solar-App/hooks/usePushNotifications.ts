import { useState, useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { api } from '@/services/api';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('[PUSH] Web platform - notifications not supported');
    return null;
  }

  const isDevice = Constants.executionEnvironment === 'standalone' || 
                   Constants.executionEnvironment === 'storeClient';
  
  if (!isDevice && __DEV__) {
    console.log('[PUSH] Running in Expo Go - push notifications available');
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[PUSH] Permission not granted');
      return null;
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    if (!projectId) {
      console.log('[PUSH] No project ID found');
      return null;
    }

    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[PUSH] Token obtained:', token.data);

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#0066CC',
      });
    }

    return token.data;
  } catch (error) {
    console.error('[PUSH] Error getting token:', error);
    return null;
  }
}

export function usePushNotifications() {
  const [expoPushToken, setExpoPushToken] = useState<string | null>(null);
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  useEffect(() => {
    const notificationSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('[PUSH] Notification received:', notification);
      setNotification(notification);
    });
    notificationListener.current = notificationSubscription;

    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('[PUSH] Notification response:', response);
      const data = response.notification.request.content.data;
      if (data?.type === 'status_change' || data?.type === 'appointment_set' || data?.type === 'report_sent') {
        console.log('[PUSH] Intervention notification tapped:', data.interventionNumber);
      }
    });
    responseListener.current = responseSubscription;

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const registerPushToken = async (): Promise<boolean> => {
    try {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setExpoPushToken(token);
        
        const platform = Platform.OS;
        const response = await api.registerPushToken(token, platform);
        
        if (response.success) {
          console.log('[PUSH] Token registered on server');
          return true;
        } else {
          console.error('[PUSH] Failed to register token on server:', response.error);
          return false;
        }
      }
      return false;
    } catch (error) {
      console.error('[PUSH] Error registering push token:', error);
      return false;
    }
  };

  const unregisterPushToken = async (): Promise<void> => {
    if (expoPushToken) {
      try {
        await api.unregisterPushToken(expoPushToken);
        setExpoPushToken(null);
        console.log('[PUSH] Token unregistered');
      } catch (error) {
        console.error('[PUSH] Error unregistering token:', error);
      }
    }
  };

  return {
    expoPushToken,
    notification,
    registerPushToken,
    unregisterPushToken,
  };
}
