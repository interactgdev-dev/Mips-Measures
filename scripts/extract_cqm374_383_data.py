"""Extract denominator code lists from 2026 MIPS CQM PDFs into utils/measures/data/."""
from __future__ import annotations

import json
import os
import re

from pypdf import PdfReader

ROOT = os.path.join(os.path.dirname(__file__), "..", "utils", "measures", "data")
PDF374 = r"c:\Users\Waqas Rafique\AppData\Roaming\Cursor\User\workspaceStorage\4a29015f5f2da46b5d9e84f9bea789fe\pdfs\f23d96e9-e87c-45e0-80d8-c2e10abc554e\2026_Measure_374_MIPSCQM.pdf"
PDF383 = r"c:\Users\Waqas Rafique\AppData\Roaming\Cursor\User\workspaceStorage\4a29015f5f2da46b5d9e84f9bea789fe\pdfs\c3d7533f-bf51-41f8-84eb-f60b94e1a4b4\2026_Measure_383_MIPSCQM.pdf"


def norm_icd(code: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", code.upper())


def extract_374_encounters() -> list[str]:
    text = "".join(p.extract_text() or "" for p in PdfReader(PDF374).pages)
    m = re.search(
        r"Patient encounter during the performance period \(CPT or HCPCS\):\s*(.+?)\s*AND\s*Patient was referred",
        text,
        re.S,
    )
    block = m.group(1)
    return sorted(set(re.findall(r"\b\d{5}\b", block)))


def extract_383() -> dict:
    text = "".join(p.extract_text() or "" for p in PdfReader(PDF383).pages)

    m_sch = re.search(
        r"\(ICD-10-CM\):\s*([F0-9.,\s]+?)\s*AND\s*Acute Inpatient",
        text,
        re.S,
    )
    schiz = sorted(set(re.findall(r"F\d{2}(?:\.\d+)?", m_sch.group(1)))) if m_sch else []

    m1 = re.search(
        r"Acute Inpatient Setting \(CPT\):\s*(.+?)\s*WITH\s*Place of Service \(POS\): 21, 51",
        text,
        re.S,
    )
    m2 = re.search(
        r"Outpatient, Emergency Department, or Non-Acute Inpatient Setting \(CPT or HCPCS\):\s*(.+?)\s*WITH\s*Outpatient Place of Service",
        text,
        re.S,
    )

    def cpts(s: str) -> list[str]:
        s = s.replace("*", "")
        return re.findall(r"\b(?:\d{5}|G\d{4}|H\d{4}|S\d{4}|T\d{4})\b", s, re.I)

    b1 = m1.group(1) if m1 else ""
    b2 = m2.group(1) if m2 else ""
    encounters = sorted(set(cpts(b1) + cpts(b2)))

    m_dem = re.search(
        r"Exclusion for Dementia \[M1452\] is defined by the following coding only:\s*(.+?)\s*NUMERATOR:",
        text,
        re.S,
    )
    block = m_dem.group(1) if m_dem else ""
    dementia = sorted(set(re.findall(r"\b[FEG]\d{2}(?:\.\d+)?\b", block)))

    # POS union: acute 21,51; outpatient list; ED 23; non-acute 31,32,55,56,61
    pos_out = [
        2, 3, 4, 5, 7, 9, 10, 11, 12, 13, 14, 15, 16, 17, 19, 20, 22, 24, 33, 49, 50, 52, 53, 54, 57, 58, 62, 65, 71, 72
    ]
    pos_acute = [21, 51]
    pos_ed = [23]
    pos_nonacute = [31, 32, 55, 56, 61]
    pos_allowed = sorted(set(pos_out + pos_acute + pos_ed + pos_nonacute))

    schiz_norm = sorted({norm_icd(c) for c in schiz})
    dementia_norm = sorted({norm_icd(c) for c in dementia})

    return {
        "schizophreniaIcdNormalized": schiz_norm,
        "encounterCptHcpcs": encounters,
        "dementiaExclusionIcdNormalized": dementia_norm,
        "placeOfServiceAllowed": pos_allowed,
    }


def main() -> None:
    os.makedirs(ROOT, exist_ok=True)

    enc374 = extract_374_encounters()
    with open(os.path.join(ROOT, "measure374DenominatorEncounter.json"), "w", encoding="utf-8") as f:
        json.dump(enc374, f, separators=(",", ":"))

    d383 = extract_383()
    with open(os.path.join(ROOT, "measure383Denominator.json"), "w", encoding="utf-8") as f:
        json.dump(d383, f, separators=(",", ":"))

    print("374 encounters", len(enc374), "383 keys", list(d383.keys()))


if __name__ == "__main__":
    main()
