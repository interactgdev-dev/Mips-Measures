from pypdf import PdfReader
import json
import os
import re

BASE = os.path.join(os.path.dirname(__file__), "..", "utils", "measures", "data")
PDF357 = r"c:\Users\Waqas Rafique\AppData\Roaming\Cursor\User\workspaceStorage\4a29015f5f2da46b5d9e84f9bea789fe\pdfs\605a352c-c129-43d7-9a08-4158c7d910e8\2026_Measure_357_MIPSCQM.pdf"
PDF358 = r"c:\Users\Waqas Rafique\AppData\Roaming\Cursor\User\workspaceStorage\4a29015f5f2da46b5d9e84f9bea789fe\pdfs\f33389d7-78fb-44cf-bb31-55e0fa2a821d\2026_Measure_358_MIPSCQM.pdf"


def extract_357():
    text = "".join(p.extract_text() or "" for p in PdfReader(PDF357).pages)
    m = re.search(
        r"Patient procedure during the performance period \(CPT\):\s*(.+?)\s*NUMERATOR:",
        text,
        re.S,
    )
    block = m.group(1)
    return sorted(set(re.findall(r"\b\d{5}\b", block)))


def extract_358():
    text = "".join(p.extract_text() or "" for p in PdfReader(PDF358).pages)
    m = re.search(
        r"Patient procedure during the performance period \(CPT\):\s*(.+?)\s*AND NOT",
        text,
        re.S,
    )
    block = m.group(1)
    return sorted(set(re.findall(r"\b(\d{5}|\d{4}T)\*?\b", block)))


def main():
    os.makedirs(BASE, exist_ok=True)
    for name, codes in [
        ("measure357DenominatorCpt.json", extract_357()),
        ("measure358DenominatorCpt.json", extract_358()),
    ]:
        path = os.path.join(BASE, name)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(codes, f, separators=(",", ":"))
        print(name, len(codes), path)


if __name__ == "__main__":
    main()
