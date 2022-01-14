#import <React/RCTBridgeDelegate.h>
#import <UIKit/UIKit.h>
#import <TSBackgroundFetch/TSBackgroundFetch.h>

#import <UserNotifications/UNUserNotificationCenter.h>

@interface AppDelegate : UIResponder <UIApplicationDelegate, RCTBridgeDelegate,UNUserNotificationCenterDelegate>

@property (nonatomic, strong) UIWindow *window;

@end
