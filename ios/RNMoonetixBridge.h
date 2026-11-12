// Plain Objective-C wrapper around the Moonetix iOS SDK (MoonetixOfferwall.xcframework), so the
// Objective-C++ module never imports the SDK's Swift header.
#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef void (^RNMoonetixEventHandler)(NSString *type, NSString *_Nullable code, NSString *_Nullable message);

@interface RNMoonetixBridge : NSObject

/// Receives the SDK events (`opened`, `closed`, `error` with code and message). The last owner wins.
+ (void)setEventHandler:(RNMoonetixEventHandler)handler owner:(id)owner;

/// Removes the handler if `owner` set it last.
+ (void)removeEventHandlerForOwner:(id)owner;

+ (void)configureWithAppId:(NSString *)appId;

/// `toolbarRGB` is an opaque 24-bit RGB color, or -1 for the color from the Design tab.
+ (void)openWithToken:(NSString *)token
                title:(nullable NSString *)title
           toolbarRGB:(NSInteger)toolbarRGB
             showLogo:(BOOL)showLogo;

@end

NS_ASSUME_NONNULL_END
