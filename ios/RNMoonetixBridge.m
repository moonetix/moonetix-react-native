#import "RNMoonetixBridge.h"

#import <UIKit/UIKit.h>
#import <MoonetixOfferwall/MoonetixOfferwall-Swift.h>

static RNMoonetixEventHandler RNMoonetixHandler = nil;
static __weak id RNMoonetixHandlerOwner = nil;

static void RNMoonetixSend(NSString *type, NSString *code, NSString *message)
{
    RNMoonetixEventHandler handler = RNMoonetixHandler;
    if (handler != nil) {
        handler(type, code, message);
    }
}

@interface RNMoonetixDelegate : NSObject <MoonetixDelegate>
@end

@implementation RNMoonetixDelegate

- (void)moonetixDidOpen
{
    RNMoonetixSend(@"opened", nil, nil);
}

- (void)moonetixDidClose
{
    RNMoonetixSend(@"closed", nil, nil);
}

- (void)moonetixDidFailWithError:(MoonetixError *)error
{
    RNMoonetixSend(@"error", error.codeName, error.message);
}

@end

// Moonetix.delegate is weak, so the module keeps its delegate alive here.
static RNMoonetixDelegate *RNMoonetixSharedDelegate = nil;

@implementation RNMoonetixBridge

+ (void)attachDelegate
{
    if (RNMoonetixSharedDelegate == nil) {
        RNMoonetixSharedDelegate = [[RNMoonetixDelegate alloc] init];
    }
    Moonetix.delegate = RNMoonetixSharedDelegate;
}

+ (void)setEventHandler:(RNMoonetixEventHandler)handler owner:(id)owner
{
    RNMoonetixHandler = [handler copy];
    RNMoonetixHandlerOwner = owner;
    [self attachDelegate];
}

+ (void)removeEventHandlerForOwner:(id)owner
{
    if (RNMoonetixHandlerOwner == owner || RNMoonetixHandlerOwner == nil) {
        RNMoonetixHandler = nil;
        RNMoonetixHandlerOwner = nil;
    }
}

+ (void)configureWithAppId:(NSString *)appId
{
    [self attachDelegate];
    [Moonetix configureWithAppId:appId];
}

+ (void)openWithToken:(NSString *)token
                title:(NSString *)title
           toolbarRGB:(NSInteger)toolbarRGB
             showLogo:(BOOL)showLogo
{
    [self attachDelegate];
    UIColor *color = nil;
    if (toolbarRGB >= 0 && toolbarRGB <= 0xFFFFFF) {
        color = [UIColor colorWithRed:((toolbarRGB >> 16) & 0xFF) / 255.0
                                green:((toolbarRGB >> 8) & 0xFF) / 255.0
                                 blue:(toolbarRGB & 0xFF) / 255.0
                                alpha:1.0];
    }
    NSString *trimmed = [title stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceAndNewlineCharacterSet]];
    NSString *cleanTitle = trimmed.length > 0 ? title : nil;
    MoonetixOptions *options = [[MoonetixOptions alloc] initWithTitle:cleanTitle
                                                         toolbarColor:color
                                                             showLogo:showLogo
                                                         presentation:MoonetixPresentationFullScreen];
    [Moonetix openWithToken:token from:nil options:options];
}

@end
