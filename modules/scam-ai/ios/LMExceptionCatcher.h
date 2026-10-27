#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

/// Runs `block` and turns an Objective-C exception into a return value, so
/// Swift code can survive frameworks that throw instead of returning errors.
/// Returns YES when the block ran without an exception.
FOUNDATION_EXPORT BOOL LMTryBlock(void (NS_NOESCAPE ^block)(void), NSString * _Nullable * _Nullable reason);

NS_ASSUME_NONNULL_END
