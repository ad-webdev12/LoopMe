# Adds the app extensions (text filter, call directory, share sheet, Messages
# drawer, widget) to ios/LoopMe.xcodeproj. Idempotent: run it as
# often as you like; targets that already exist are left alone.
#
#   scripts/ios/add-extensions.sh
#
# Expo's prebuild does not know about these targets, so the project file is
# committed and this script is the record of how it was changed.
require 'xcodeproj'

ROOT = File.expand_path('../..', __dir__)
PROJ = File.join(ROOT, 'ios', 'LoopMe.xcodeproj')
TEAM = '8TPMGLDM22'

project = Xcodeproj::Project.open(PROJ)
app = project.targets.find { |t| t.name == 'LoopMe' }
raise 'LoopMe target not found' unless app

main_cfg = app.build_configurations.first.build_settings

# Shared engine sources, compiled into each extension (not the app, which runs
# the TypeScript engine; the Swift one is checked against it).
engine_dir = File.join(ROOT, 'ios', 'Shared', 'Engine')
engine_sources = Dir[File.join(engine_dir, '*.swift')]
engine_json = File.join(engine_dir, 'engine.json')
store_source = File.join(ROOT, 'modules', 'scam-ai', 'ios', 'SharedStore.swift')

def group_for(project, name, path)
  project.main_group[name] || project.main_group.new_group(name, path)
end

shared_group = group_for(project, 'Shared', 'Shared')
engine_group = shared_group['Engine'] || shared_group.new_group('Engine', 'Engine')
engine_refs = engine_sources.map { |f| engine_group.files.find { |r| r.path == File.basename(f) } || engine_group.new_file(f) }
engine_json_ref = engine_group.files.find { |r| r.path == 'engine.json' } || engine_group.new_file(engine_json)
store_ref = shared_group.files.find { |r| r.path && r.path.end_with?('SharedStore.swift') } || shared_group.new_file(store_source)

EXTENSIONS = [
  { name: 'TextFilter',    dir: 'TextFilter',    bundle: 'com.loopmescamsafety.app.textfilter', frameworks: ['IdentityLookup'] },
  { name: 'CallDirectory', dir: 'CallDirectory', bundle: 'com.loopmescamsafety.app.calls',      frameworks: ['CallKit'] },
  { name: 'ShareCheck',    dir: 'ShareCheck',    bundle: 'com.loopmescamsafety.app.share',      frameworks: ['Vision', 'UniformTypeIdentifiers'] },
  { name: 'MessagesCheck', dir: 'MessagesCheck', bundle: 'com.loopmescamsafety.app.messages',   frameworks: ['Messages'], type: :messages_extension, assets: true },
  { name: 'CheckWidget',   dir: 'CheckWidget',   bundle: 'com.loopmescamsafety.app.widget',     frameworks: ['WidgetKit', 'SwiftUI'], plain: true, min_ios: '16.0' },
]

embed = app.copy_files_build_phases.find { |p| p.name == 'Embed Foundation Extensions' }
unless embed
  embed = app.new_copy_files_build_phase('Embed Foundation Extensions')
  embed.symbol_dst_subfolder_spec = :plug_ins
end

EXTENSIONS.each do |ext|
  if project.targets.any? { |t| t.name == ext[:name] }
    puts "#{ext[:name]}: already present"
    next
  end
  target = project.new_target(ext[:type] || :app_extension, ext[:name], :ios, '15.1')
  group = group_for(project, ext[:name], ext[:dir])
  own_sources = Dir[File.join(ROOT, 'ios', ext[:dir], '*.swift')].map { |f| group.new_file(f) }
  if ext[:plain]
    target.add_file_references(own_sources)
  else
    target.add_file_references(own_sources + engine_refs + [store_ref])
    target.add_resources([engine_json_ref])
  end
  if ext[:assets]
    assets = group.new_file(File.join(ROOT, 'ios', ext[:dir], 'Assets.xcassets'))
    target.add_resources([assets])
    target.build_configurations.each { |cfg| cfg.build_settings['ASSETCATALOG_COMPILER_APPICON_NAME'] = 'iMessage App Icon' }
  end
  ext[:frameworks].each { |fw| target.add_system_framework(fw) }

  target.build_configurations.each do |cfg|
    s = cfg.build_settings
    s['PRODUCT_BUNDLE_IDENTIFIER'] = ext[:bundle]
    s['INFOPLIST_FILE'] = "#{ext[:dir]}/Info.plist"
    s['CODE_SIGN_ENTITLEMENTS'] = "#{ext[:dir]}/#{ext[:name]}.entitlements"
    s['CODE_SIGN_STYLE'] = 'Automatic'
    s['DEVELOPMENT_TEAM'] = TEAM
    s['SWIFT_VERSION'] = '5.0'
    s['TARGETED_DEVICE_FAMILY'] = '1'
    s['IPHONEOS_DEPLOYMENT_TARGET'] = ext[:min_ios] || '15.1'
    s['MARKETING_VERSION'] = main_cfg['MARKETING_VERSION'] || '1.0'
    s['CURRENT_PROJECT_VERSION'] = main_cfg['CURRENT_PROJECT_VERSION'] || '1'
    s['SKIP_INSTALL'] = 'YES'
    s['GENERATE_INFOPLIST_FILE'] = 'NO'
    s['SWIFT_OPTIMIZATION_LEVEL'] = cfg.name == 'Debug' ? '-Onone' : '-O'
    s['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
    s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
    s.delete('PRODUCT_NAME')
    s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  end

  app.add_dependency(target)
  file = embed.add_file_reference(target.product_reference, true)
  file.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  puts "#{ext[:name]}: added"
end

# The Messages drawer talks to the family link itself (ios/Shared/ExtensionCloud.swift),
# so a "Tell" tap lands on the caretaker's phone without opening the app.
if (mc = project.targets.find { |t| t.name == 'MessagesCheck' })
  cloud_path = File.join(ROOT, 'ios', 'Shared', 'ExtensionCloud.swift')
  unless mc.source_build_phase.files_references.any? { |r| r.path && r.path.end_with?('ExtensionCloud.swift') }
    ref = shared_group.files.find { |r| r.path && r.path.end_with?('ExtensionCloud.swift') } || shared_group.new_file(cloud_path)
    mc.source_build_phase.add_file_reference(ref, true)
    puts 'MessagesCheck: + ExtensionCloud.swift'
  end
  icon_path = File.join(ROOT, 'ios', 'MessagesCheck', 'loopme-icon.png')
  unless mc.resources_build_phase.files_references.any? { |r| r.path && r.path.end_with?('loopme-icon.png') }
    ref = (project.main_group['MessagesCheck'] || project.main_group.new_group('MessagesCheck', 'MessagesCheck')).new_file(icon_path)
    mc.resources_build_phase.add_file_reference(ref, true)
    puts 'MessagesCheck: + loopme-icon.png'
  end
  %w[CloudKit AVFoundation].each do |fw|
    next if mc.frameworks_build_phase.files_references.any? { |r| r.path && r.path.end_with?(fw + '.framework') }
    mc.add_system_framework(fw)
    puts "MessagesCheck: + #{fw}"
  end
end

# The Live Activity attributes are one file compiled into the app (via the
# ScamAi pod) and into the widget extension.
if (wt = project.targets.find { |t| t.name == 'CheckWidget' })
  attrs_path = File.join(ROOT, 'modules', 'scam-ai', 'ios', 'CallActivityAttributes.swift')
  unless wt.source_build_phase.files_references.any? { |r| r.path && r.path.end_with?('CallActivityAttributes.swift') }
    ref = shared_group.files.find { |r| r.path && r.path.end_with?('CallActivityAttributes.swift') } || shared_group.new_file(attrs_path)
    wt.source_build_phase.add_file_reference(ref, true)
    puts 'CheckWidget: + CallActivityAttributes.swift'
  end
end

# Live Caller ID Lookup (iOS 18) is an ExtensionKit extension: a different
# product type, embedded under Extensions/ rather than PlugIns/.
unless project.targets.any? { |t| t.name == 'CallerID' }
  target = project.new_target(:app_extension, 'CallerID', :ios, '18.0')
  target.product_type = 'com.apple.product-type.extensionkit-extension'
  target.product_reference.explicit_file_type = 'wrapper.extensionkit-extension'
  group = group_for(project, 'CallerID', 'CallerID')
  target.add_file_references(Dir[File.join(ROOT, 'ios', 'CallerID', '*.swift')].map { |f| group.new_file(f) })
  target.add_system_framework('IdentityLookup')
  target.build_configurations.each do |cfg|
    s = cfg.build_settings
    s['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.loopmescamsafety.app.callerid'
    s['INFOPLIST_FILE'] = 'CallerID/Info.plist'
    s['CODE_SIGN_ENTITLEMENTS'] = 'CallerID/CallerID.entitlements'
    s['CODE_SIGN_STYLE'] = 'Automatic'
    s['DEVELOPMENT_TEAM'] = TEAM
    s['SWIFT_VERSION'] = '5.0'
    s['TARGETED_DEVICE_FAMILY'] = '1'
    s['IPHONEOS_DEPLOYMENT_TARGET'] = '18.0'
    s['MARKETING_VERSION'] = main_cfg['MARKETING_VERSION'] || '1.0'
    s['CURRENT_PROJECT_VERSION'] = main_cfg['CURRENT_PROJECT_VERSION'] || '1'
    s['SKIP_INSTALL'] = 'YES'
    s['GENERATE_INFOPLIST_FILE'] = 'NO'
    s['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
    s['SWIFT_OPTIMIZATION_LEVEL'] = cfg.name == 'Debug' ? '-Onone' : '-O'
    s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks', '@executable_path/../../Frameworks']
    s['PRODUCT_NAME'] = '$(TARGET_NAME)'
  end
  app.add_dependency(target)
  embed_ext = app.copy_files_build_phases.find { |p| p.name == 'Embed ExtensionKit Extensions' }
  unless embed_ext
    embed_ext = app.new_copy_files_build_phase('Embed ExtensionKit Extensions')
    embed_ext.dst_subfolder_spec = '16'
    embed_ext.dst_path = '$(EXTENSIONS_FOLDER_PATH)'
  end
  f = embed_ext.add_file_reference(target.product_reference, true)
  f.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  puts 'CallerID: added'
end

# Apple Watch app (watchOS 10, single target), embedded in the iPhone app.
unless project.targets.any? { |t| t.name == 'LoopMeWatch' }
  target = project.new_target(:application, 'LoopMeWatch', :watchos, '10.0')
  group = group_for(project, 'LoopMeWatch', 'LoopMeWatch')
  target.add_file_references(Dir[File.join(ROOT, 'ios', 'LoopMeWatch', '*.swift')].map { |f| group.new_file(f) })
  target.build_configurations.each do |cfg|
    s = cfg.build_settings
    s['PRODUCT_BUNDLE_IDENTIFIER'] = 'com.loopmescamsafety.app.watchkitapp'
    s['INFOPLIST_FILE'] = 'LoopMeWatch/Info.plist'
    s['CODE_SIGN_STYLE'] = 'Automatic'
    s['DEVELOPMENT_TEAM'] = TEAM
    s['SWIFT_VERSION'] = '5.0'
    s['SDKROOT'] = 'watchos'
    s['TARGETED_DEVICE_FAMILY'] = '4'
    s['WATCHOS_DEPLOYMENT_TARGET'] = '10.0'
    s['MARKETING_VERSION'] = main_cfg['MARKETING_VERSION'] || '1.0'
    s['CURRENT_PROJECT_VERSION'] = main_cfg['CURRENT_PROJECT_VERSION'] || '1'
    s['SKIP_INSTALL'] = 'YES'
    s['GENERATE_INFOPLIST_FILE'] = 'NO'
    s['ENABLE_USER_SCRIPT_SANDBOXING'] = 'NO'
    s['ENABLE_PREVIEWS'] = 'YES'
    s['SWIFT_OPTIMIZATION_LEVEL'] = cfg.name == 'Debug' ? '-Onone' : '-O'
    s['LD_RUNPATH_SEARCH_PATHS'] = ['$(inherited)', '@executable_path/Frameworks']
    s['PRODUCT_NAME'] = '$(TARGET_NAME)'
    s['ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME'] = 'AccentColor'
    s.delete('IPHONEOS_DEPLOYMENT_TARGET')
  end
  app.add_dependency(target)
  embed_watch = app.copy_files_build_phases.find { |p| p.name == 'Embed Watch Content' }
  unless embed_watch
    embed_watch = app.new_copy_files_build_phase('Embed Watch Content')
    embed_watch.dst_subfolder_spec = '16'
    embed_watch.dst_path = '$(CONTENTS_FOLDER_PATH)/Watch'
  end
  f = embed_watch.add_file_reference(target.product_reference, true)
  f.settings = { 'ATTRIBUTES' => ['RemoveHeadersOnCopy'] }
  puts 'LoopMeWatch: added'
end

# The Siri intent lives in the app target. AppIntents is iOS 16+, so it is
# weak-linked and the code is @available-guarded.
intent_path = File.join(ROOT, 'ios', 'LoopMe', 'CheckIntent.swift')
app_group = project.main_group['LoopMe']
if app_group && File.exist?(intent_path) && !app.source_build_phase.files_references.any? { |r| r.path && r.path.end_with?('CheckIntent.swift') }
  ref = app_group.new_file(intent_path)
  app.source_build_phase.add_file_reference(ref, true)
  fw_ref = app.add_system_framework('AppIntents').first
  bf = app.frameworks_build_phase.files.find { |f| f.file_ref == fw_ref }
  bf.settings = { 'ATTRIBUTES' => ['Weak'] } if bf
  puts 'LoopMe: + CheckIntent.swift (AppIntents, weak)'
end

project.save
puts 'saved'
