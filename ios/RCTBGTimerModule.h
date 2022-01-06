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



@interface RCTBGTimerModule : RCTEventEmitter <RCTBridgeModule>

@property NSInteger counter;
@property NSInteger timeInterval;
@property BOOL stopTimer;
@end


#endif /* RCTBGTimerModule_h */
