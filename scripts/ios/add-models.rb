# Keeps the extension targets in step with ios/Shared/Engine: every engine
# Swift file compiles into each extension, and the Core ML models compile
# (to .mlmodelc) into the targets that use them. Idempotent.
#
#   scripts/ios/add-extensions.sh   (runs add-extensions.rb then this file)
require 'xcodeproj'

ROOT = File.expand_path('../..', __dir__)
PROJ = File.join(ROOT, 'ios', 'LoopMe.xcodeproj')
project = Xcodeproj::Project.open(PROJ)

engine_group = project.main_group['Shared'] && project.main_group['Shared']['Engine']
engine_group ||= project.main_group.new_group('Shared', 'Shared').new_group('Engine', 'Engine')

def ref_for(group, abs_path, root)
  rel = Pathname.new(abs_path).relative_path_from(Pathname.new(File.join(root, 'ios'))).to_s
  existing = group.files.find { |f| f.real_path.to_s == abs_path }
  existing || group.new_file(abs_path)
end

def ensure_source(target, ref)
  return if target.source_build_phase.files_references.include?(ref)
  target.source_build_phase.add_file_reference(ref, true)
  puts "#{target.name}: + #{File.basename(ref.path)}"
end

engine_dir = File.join(ROOT, 'ios', 'Shared', 'Engine')
engine_refs = Dir[File.join(engine_dir, '*.swift')].sort.map { |f| ref_for(engine_group, f, ROOT) }
filter_model = ref_for(engine_group, File.join(engine_dir, 'ScamFilter.mlmodel'), ROOT)
text_model = ref_for(project.main_group['scam-ai'] || project.main_group.new_group('scam-ai', File.join(ROOT, 'modules', 'scam-ai', 'ios', 'Resources')),
                     File.join(ROOT, 'modules', 'scam-ai', 'ios', 'Resources', 'ScamText.mlmodel'), ROOT)

%w[TextFilter CallDirectory ShareCheck].each do |name|
  target = project.targets.find { |t| t.name == name }
  next puts("#{name}: missing, run add-extensions.rb first") unless target
  engine_refs.each { |r| ensure_source(target, r) }
  ensure_source(target, filter_model) if name == 'TextFilter'
  ensure_source(target, text_model) if name == 'ShareCheck'
end
project.save
puts 'saved'
