# Adds the three app extensions to ios/LoopMe.xcodeproj. Idempotent: run it as
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
  target = project.new_target(:app_extension, ext[:name], :ios, '15.1')
  group = group_for(project, ext[:name], ext[:dir])
  own_sources = Dir[File.join(ROOT, 'ios', ext[:dir], '*.swift')].map { |f| group.new_file(f) }
  target.add_file_references(own_sources + engine_refs + [store_ref])
  target.add_resources([engine_json_ref])
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
    s['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
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

project.save
puts 'saved'
