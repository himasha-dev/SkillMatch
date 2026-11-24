#!/usr/bin/env python3
"""Summarise a JMeter CSV results file (.jtl): per-endpoint samples, response times,
throughput and error rate, printed as a Markdown table.
Usage: python3 performance/summarize_jtl.py performance/results/results.jtl"""
import csv
import sys
from collections import defaultdict


def pct(values, p):
    values = sorted(values)
    if not values:
        return 0
    k = max(0, min(len(values) - 1, int(round(p / 100 * len(values) + 0.5)) - 1))
    return values[k]


def summarise(path):
    rows = list(csv.DictReader(open(path, newline="")))
    if not rows:
        print("No samples in", path)
        return 1
    groups = defaultdict(list)
    for r in rows:
        groups[r["label"]].append(r)
        groups["TOTAL"].append(r)
    start = min(int(r["timeStamp"]) for r in rows)
    end = max(int(r["timeStamp"]) + int(r["elapsed"]) for r in rows)
    secs = max((end - start) / 1000, 0.001)
    print(f"Test window: {secs:.1f} s, samples: {len(rows)}\n")
    print("| Endpoint | Samples | Avg (ms) | Median | p90 | p95 | Max | Throughput (req/s) | Errors |")
    print("|---|---:|---:|---:|---:|---:|---:|---:|---:|")
    for label in sorted(groups, key=lambda l: (l == "TOTAL", l)):
        g = groups[label]
        t = [int(r["elapsed"]) for r in g]
        err = sum(1 for r in g if r["success"].lower() != "true")
        print(f"| {label} | {len(g)} | {sum(t)/len(t):.1f} | {pct(t,50)} | {pct(t,90)} | {pct(t,95)} | {max(t)} "
              f"| {len(g)/secs:.1f} | {100*err/len(g):.2f}% |")
    return 0


if __name__ == "__main__":
    sys.exit(summarise(sys.argv[1]))
