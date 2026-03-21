from pathlib import Path
import json
from runtime_types.parsers import load_runtime_step_artifacts

base = Path('schemas/examples')
for name in ['runtime-step-artifacts.example.json', 'runtime-step-artifacts-empty.example.json']:
    payload = json.loads((base / name).read_text(encoding='utf-8'))
    parsed = load_runtime_step_artifacts(payload)
    print(name, parsed['promotion_analysis']['status'], parsed['feedback_selection']['selected'])
