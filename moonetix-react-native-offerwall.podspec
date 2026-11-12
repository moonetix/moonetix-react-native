require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

Pod::Spec.new do |s|
  s.name         = "moonetix-react-native-offerwall"
  s.version      = package["version"]
  s.summary      = "Moonetix offerwall for React Native and Expo apps."
  s.description  = "React Native module for the Moonetix offerwall. On iOS it uses the Moonetix iOS SDK (MoonetixOfferwall 2.0.1, bundled)."
  s.homepage     = "https://docs.moonetix.com/react-native-sdk"
  s.license      = { :type => "Apache-2.0", :file => "LICENSE" }
  s.authors      = { "Moonetix" => "partners@moonetix.com" }
  s.platforms    = { :ios => "13.0" }
  s.source       = { :http => "https://moonetix.com/downloads/moonetix-react-native-offerwall-#{s.version}.tgz" }

  s.source_files = "ios/*.{h,m,mm}"
  s.private_header_files = "ios/*.h"
  s.vendored_frameworks = "ios/Frameworks/MoonetixOfferwall.xcframework"
  s.frameworks = "UIKit", "WebKit"

  if respond_to?(:install_modules_dependencies, true)
    install_modules_dependencies(s)
  else
    s.dependency "React-Core"
  end
end
