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
ai_dir = File.join(ROOT, 'modules', 'scam-ai', 'ios')
ai_group = project.main_group['scam-ai'] || project.main_group.new_group('scam-ai', ai_dir)
net_swift = ref_for(ai_group, File.join(ai_dir, 'ScamNetRunner.swift'), ROOT)
net_model = ref_for(ai_group, File.join(ai_dir, 'Resources', 'ScamNet.mlmodel'), ROOT)
net_vocab = ref_for(ai_group, File.join(ai_dir, 'Resources', 'ScamNet.vocab.txt'), ROOT)
lite_bin = ref_for(engine_group, File.join(engine_dir, 'ScamNetLite.bin'), ROOT)

def ensure_resource(target, ref)
  return if target.resources_build_phase.files_references.include?(ref)
  target.resources_build_phase.add_file_reference(ref, true)
  puts "#{target.name}: + resource #{File.basename(ref.path)}"
end

# The old Create ML models are gone; drop any leftover references.
%w[ScamText.mlmodel ScamFilter.mlmodel scam-ai/ios/ScamNet.swift].each do |old|
  project.files.select { |f| f.real_path.to_s.end_with?(old) }.each { |f| f.remove_from_project; puts "- #{old}" }
end

%w[TextFilter CallDirectory ShareCheck MessagesCheck].each do |name|
  target = project.targets.find { |t| t.name == name }
  next puts("#{name}: missing, run add-extensions.rb first") unless target
  engine_refs.each { |r| ensure_source(target, r) }
  ensure_source(target, net_swift)   # CoreModel.swift needs the type even where no model ships
  next if name == 'CallDirectory'
  ensure_resource(target, net_vocab)
  if name == 'TextFilter'
    # The filter runs ScamNet Lite only: the full model does not fit its memory cap.
    ensure_resource(target, lite_bin)
    target.source_build_phase.files.select { |f| f.file_ref == net_model }.each { |f| f.remove_from_project; puts "TextFilter: - ScamNet.mlmodel" }
  else
    ensure_source(target, net_model)
  end
end
project.save
puts 'saved'
