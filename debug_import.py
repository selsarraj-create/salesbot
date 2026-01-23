import sys
import os

# Force utf-8 printing for Windows if needed, or just use ASCII
sys.path.append(os.getcwd())

print("Attempting to import modules...")

try:
    print("Importing sales_prompts...")
    from api.utils import sales_prompts
    print("[OK] sales_prompts imported successfully")
except Exception as e:
    print(f"[FAIL] Failed to import sales_prompts: {e}")
    import traceback
    traceback.print_exc()

try:
    print("Importing gemini_client...")
    from api.utils import gemini_client
    print("[OK] gemini_client imported successfully")
except Exception as e:
    print(f"[FAIL] Failed to import gemini_client: {e}")
    import traceback
    traceback.print_exc()

try:
    print("Importing sandbox...")
    from api import sandbox
    print("[OK] sandbox imported successfully")
except Exception as e:
    print(f"[FAIL] Failed to import sandbox: {e}")
    import traceback
    traceback.print_exc()
