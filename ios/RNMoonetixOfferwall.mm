// iOS side of @moonetix/react-native-offerwall. A TurboModule with the New Architecture and a bridge
// module with the old one. It calls the Moonetix iOS SDK through RNMoonetixBridge and sends its
// events to JavaScript as one event, MoonetixOfferwallEvent, with type, and code and message for errors.
// The session token only passes through memory. It is never logged.

#import <React/RCTEventEmitter.h>

#import "RNMoonetixBridge.h"

#ifdef RCT_NEW_ARCH_ENABLED
#import <RNMoonetixOfferwallSpec/RNMoonetixOfferwallSpec.h>
#endif

static NSString *const RNMoonetixEventName = @"MoonetixOfferwallEvent";

#ifdef RCT_NEW_ARCH_ENABLED
@interface RNMoonetixOfferwall : RCTEventEmitter <NativeMoonetixOfferwallSpec>
#else
@interface RNMoonetixOfferwall : RCTEventEmitter <RCTBridgeModule>
#endif
@end

@implementation RNMoonetixOfferwall

RCT_EXPORT_MODULE(MoonetixOfferwall)

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

- (dispatch_queue_t)methodQueue
{
    return dispatch_get_main_queue();
}

- (NSArray<NSString *> *)supportedEvents
{
    return @[ RNMoonetixEventName ];
}

- (void)attachEvents
{
    __weak RNMoonetixOfferwall *weakSelf = self;
    [RNMoonetixBridge setEventHandler:^(NSString *type, NSString *code, NSString *message) {
        RNMoonetixOfferwall *strongSelf = weakSelf;
        if (strongSelf == nil) {
            return;
        }
        NSMutableDictionary *body = [NSMutableDictionary dictionaryWithObject:type forKey:@"type"];
        if (code != nil) {
            body[@"code"] = code;
            body[@"message"] = message ?: @"";
        }
        [strongSelf sendEventWithName:RNMoonetixEventName body:body];
    }
                                owner:self];
}

- (void)doConfigure:(NSString *)appId
{
    [self attachEvents];
    [RNMoonetixBridge configureWithAppId:appId ?: @""];
}

- (void)doOpen:(NSString *)token title:(NSString *)title toolbarColor:(double)toolbarColor showLogo:(BOOL)showLogo
{
    // The React instance that opens the offerwall receives its events.
    [self attachEvents];
    NSInteger rgb = (toolbarColor >= 0 && toolbarColor <= 0xFFFFFF) ? (NSInteger)toolbarColor : -1;
    [RNMoonetixBridge openWithToken:token ?: @"" title:title toolbarRGB:rgb showLogo:showLogo];
}

#ifdef RCT_NEW_ARCH_ENABLED

- (void)configure:(NSString *)appId
{
    [self doConfigure:appId];
}

- (void)open:(NSString *)token title:(NSString *)title toolbarColor:(double)toolbarColor showLogo:(BOOL)showLogo
{
    [self doOpen:token title:title toolbarColor:toolbarColor showLogo:showLogo];
}

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeMoonetixOfferwallSpecJSI>(params);
}

#else

RCT_EXPORT_METHOD(configure : (NSString *)appId)
{
    [self doConfigure:appId];
}

RCT_EXPORT_METHOD(open : (NSString *)token title : (NSString *)title toolbarColor : (double)toolbarColor showLogo : (BOOL)showLogo)
{
    [self doOpen:token title:title toolbarColor:toolbarColor showLogo:showLogo];
}

#endif

- (void)invalidate
{
    [RNMoonetixBridge removeEventHandlerForOwner:self];
    [super invalidate];
}

@end
