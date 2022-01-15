//
//  RCTBGTimerModule.h
//  adaan
//
//  Created by Ghous Nawaz on 06/01/22.
//

#ifndef RCTBGTimerModule_h
#define RCTBGTimerModule_h
//  RCTCalendarModule.h
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
#import <UserNotifications/UNUserNotificationCenter.h>
#import <UIKIt/UIKit.h>



@interface RCTBGTimerModule : RCTEventEmitter <RCTBridgeModule>

@property NSDictionary* nearestSalat;


@end


#endif /* RCTBGTimerModule_h */
