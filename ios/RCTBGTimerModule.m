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




@implementation RCTBGTimerModule
{
  bool hasListeners;
}


- (NSArray<NSString *> *)supportedEvents {
    return @[@"onSalatAlert"];
}

// To export a module named RCTCalendarModule
RCT_EXPORT_MODULE();

RCT_EXPORT_METHOD(createBackgroundTimer:(float)timeInterval callback: (RCTResponseSenderBlock)callback)
{
  
  /* callback(@[@(counter)]);*/
 RCTLogInfo(@"Pretending to create an event %f ", timeInterval);
  _timeInterval = timeInterval;
  
  callback(@[@(_stopTimer)]);
  dispatch_async(dispatch_get_main_queue(), ^{
    [NSTimer scheduledTimerWithTimeInterval:5.0f target:self selector:@selector(methodToRun:) userInfo:nil repeats:YES];
   
  });
}

// Will be called when this module's first listener is added.
-(void)startObserving {
    hasListeners = YES;
}

// Will be called when this module's last listener is removed, or on dealloc.
-(void)stopObserving {
    hasListeners = NO;
}

- (void) methodToRun:(NSTimer*)t {
  // Code here
  // NSInteger counter =  0;
  _counter = _counter + 1;
  RCTLogInfo(@"Pretending to create an event %@ at %ld", t,_counter);
  if(_counter == _timeInterval){
    _stopTimer = true;
   //  timeGap timeDiff = _timeInterval - _counter;
    if (hasListeners) { // Only send events if anyone is listening
      [self sendEventWithName:@"onSalatAlert" body:@{@"time": @"Done"}];
      }
    [t invalidate];
  }else {
    _stopTimer = false;
    
  }
  
}


@end

