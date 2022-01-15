//
//  RCTBGTimerModule.m
//  adaan
//
//  Created by Ghous Nawaz on 06/01/22.
//

#import <Foundation/Foundation.h>

// RCTCalendarModule.m
#import "RCTBGTimerModule.h"
#import <React/RCTLog.h>
#import <BackgroundTasks/BackgroundTasks.h>
#import <UserNotifications/UNUserNotificationCenter.h>
#import <UserNotifications/UNNotificationContent.h>
#import <UserNotifications/UNNotificationTrigger.h>
#import <UserNotifications/UNNotificationSound.h>
#import <UserNotifications/UNNotificationRequest.h>
#import <UIKIt/UIKit.h>


bool isGrantedNotificationAccess;


@implementation RCTBGTimerModule
{
  bool hasListeners;
}


- (NSArray<NSString *> *)supportedEvents {
    return @[@"onSalatAlert"];
}

// To export a module named RCTCalendarModule
RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(createBackgroundTimer:(NSDictionary*)nearestSalat)
{
  _nearestSalat = nearestSalat;
  /* callback(@[@(counter)]);*/
  RCTLogInfo(@"JS to Native call %@ ", nearestSalat);

  [self registerNotification];
  
}


-(void) registerNotification {
  
  isGrantedNotificationAccess = false;
  
  UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
  
  //NSDate *todaySehri = [calendar dateFromComponents:components]; //unused
  UNAuthorizationOptions options = UNAuthorizationOptionAlert + UNAuthorizationOptionSound;
  [center requestAuthorizationWithOptions:options completionHandler:^(BOOL granted, NSError * _Nullable error) {
    NSLog(@"check access %id",granted);
    isGrantedNotificationAccess = granted;
    [self showNotification];
  }];
  
}

// Will be called when this module's first listener is added.
-(void)startObserving {
    hasListeners = YES;
}

// Will be called when this module's last listener is removed, or on dealloc.
-(void)stopObserving {
    hasListeners = NO;
}

-(void) didReceiveMemoryWarning {
  //[super didReceiveMemoryWarning];
  // Dispose of any resources that can be recreated.
}


-(void) showNotification {
  NSLog(@"Hi I am into my method");
  if (isGrantedNotificationAccess){
    UNUserNotificationCenter *center = [UNUserNotificationCenter currentNotificationCenter];
    UNMutableNotificationContent *content = [[UNMutableNotificationContent alloc] init];
    
    NSString *subTitle = [NSString stringWithFormat: @"%@ %s", _nearestSalat[@"title"], " Salat Time Starts"];
    NSString *body = [NSString stringWithFormat: @"%@ %s", _nearestSalat[@"namaz"], ""];
    NSLog(@"Hi I am into my method");
    content.title = @"Adaan";
    content.subtitle = subTitle;
    content.body= body;
    content.sound = [UNNotificationSound defaultSound];
    
    NSDateFormatter *dateFormatter = [[NSDateFormatter alloc]init];
    dateFormatter.dateFormat = @"yyyy-MM-dd";
    NSString * salatTime= _nearestSalat[@"namaz"];
    NSLog(@"salat time %@ ", salatTime);
    NSDate *date = [NSDate date]; // your NSDate object
    NSString *dateString = [dateFormatter stringFromDate:date];
  
    NSString *str = [NSString stringWithFormat: @"%@ %@", dateString, salatTime];
    NSLog(@"date stringl %@ ", str);
    [dateFormatter setDateFormat:@"yyyy-MM-dd HH:mm"];
   // [dateFormatter setTimeZone:[NSTimeZone timeZoneWithAbbreviation:@"UTC"]];
    NSLog(@"entery 7 %@",[dateFormatter dateFromString:str]);
    NSLog(@"%@",[dateFormatter dateFromString:str]);
    NSDate *now = [dateFormatter dateFromString:str];

    NSCalendar *calendar = [[NSCalendar alloc] initWithCalendarIdentifier:NSCalendarIdentifierGregorian];

    [calendar setTimeZone:[NSTimeZone localTimeZone]];

   /* NSDateComponents *components = [calendar components:NSCalendarUnitYear|NSCalendarUnitMonth|NSCalendarUnitDay|NSCalendarUnitHour|NSCalendarUnitMinute|NSCalendarUnitSecond|NSCalendarUnitTimeZone fromDate:now];*/
    NSDateComponents *components = [calendar components:NSCalendarUnitHour|NSCalendarUnitMinute|NSCalendarUnitTimeZone fromDate:now];
    
    UNCalendarNotificationTrigger *trigger = [UNCalendarNotificationTrigger triggerWithDateMatchingComponents:components repeats:NO];

 
    /// 4. update application icon badge number
   // content.badge = @([[UIApplication sharedApplication] applicationIconBadgeNumber] + 1);
    
    //UNTimeIntervalNotificationTrigger *trigger = [UNTimeIntervalNotificationTrigger
                                                  //triggerWithTimeInterval:60 //repeats:YES];
    // setting up the request for notification
    UNNotificationRequest *request = [UNNotificationRequest requestWithIdentifier:@"com.adaan.salat_alert"
          content:content trigger:trigger];
    [center addNotificationRequest:request withCompletionHandler:nil];
  }
}


@end

