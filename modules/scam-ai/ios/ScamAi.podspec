require 'json'

package = JSON.parse(File.read(File.join(__dir__, '..', 'package.json')))

Pod::Spec.new do |s|
  s.name           = 'ScamAi'
  s.version        = package['version']
  s.summary        = package['description'] || 'On-device scam AI'
  s.description    = package['description'] || 'On-device scam AI'
  s.license        = 'MIT'
  s.author         = 'Loop Me In'
  s.homepage       = 'https://github.com/ad-webdev12/LoopMe'
  s.platforms      = { :ios => '15.1' }
  s.swift_version  = '5.9'
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
  s.resources = "Resources/**/*"
end
