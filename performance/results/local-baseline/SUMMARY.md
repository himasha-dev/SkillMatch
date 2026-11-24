# Local preliminary load test (NOT JMeter)

Real Express app, Mongoose models stubbed in memory (no MongoDB in sandbox), 50 concurrent virtual users,
no think time, 30 s, generator: closed-model Node script writing JMeter CSV. Machine: 2 vCPU, Node v22.23.5.
Pass criterion per sample = HTTP 200 AND < 2000 ms (same as the JMeter Duration Assertion).

Test window: 30.0 s, samples: 64240

| Endpoint | Samples | Avg (ms) | Median | p90 | p95 | Max | Throughput (req/s) | Errors |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| GET /api/applications | 12838 | 13.0 | 11 | 21 | 26 | 96 | 427.4 | 0.00% |
| GET /api/health | 12838 | 13.1 | 11 | 21 | 25 | 3145 | 427.4 | 0.01% |
| GET /api/internships (page 1) | 12838 | 13.0 | 11 | 21 | 26 | 96 | 427.4 | 0.00% |
| GET /api/internships (search+filter+sort) | 12838 | 12.9 | 11 | 21 | 25 | 80 | 427.4 | 0.00% |
| GET /api/internships/:id | 12838 | 12.9 | 11 | 21 | 25 | 96 | 427.4 | 0.00% |
| POST /api/auth/login | 50 | 13302.3 | 13366 | 13375 | 13376 | 13377 | 1.7 | 100.00% |
| TOTAL | 64240 | 23.3 | 11 | 21 | 26 | 13377 | 2138.9 | 0.08% |

All 50 login responses were HTTP 200; they 'fail' only the 2 s response-time assertion.
bcryptjs compare timing on this machine: cost 10 = 68 ms, cost 12 = 266 ms; 50 x 266 ms = 13.3 s = observed login average.
