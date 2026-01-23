import os
import zipfile
import xml.etree.ElementTree as ET

def get_docx_text(path):
    try:
        with zipfile.ZipFile(path) as document:
            xml_content = document.read('word/document.xml')
            tree = ET.fromstring(xml_content)
            
            text_parts = []
            ns = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
            
            for node in tree.iter():
                if node.tag.endswith('}t'):
                    if node.text:
                        text_parts.append(node.text)
                elif node.tag.endswith('}p'):
                    text_parts.append('\n')
            
            return "".join(text_parts)
    except Exception as e:
        return f"Error reading {path}: {str(e)}"

context_dir = r"d:\SALESBOT\context"
# Analyze transcripts and pitch docs
files_to_analyze = [
    "2 Modelling assessment booking Stephen_.docx",
    "4 Modelling_Call_Transcript_Loyalty.docx",
    "5 Recording Female said she was busy but converted.docx",
    "SALLY Pitch 2_.docx",
    "SalesApe ai Pitch 1.docx"
]

print(f"Analyzing {len(files_to_analyze)} specific documents for deeper insights.\n")

for filename in files_to_analyze:
    full_path = os.path.join(context_dir, filename)
    if os.path.exists(full_path):
        print(f"--- START OF {filename} ---")
        content = get_docx_text(full_path)
        print(content) 
        print(f"--- END OF {filename} ---\n\n")
    else:
        print(f"File not found: {filename}")
