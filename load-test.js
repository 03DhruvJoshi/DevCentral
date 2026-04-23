import http from "k6/http";
import { check, sleep } from "k6";

export const options = {
  stages: [
    { duration: "30s", target: 35 },
    { duration: "1m", target: 35 },
    { duration: "30s", target: 0 },
  ],
  thresholds: {
    http_req_duration: ["p(95)<500"],

    http_req_failed: ["rate<0.01"],
  },
};

export default function () {
  const res = http.get("https://devcentral.online");

  check(res, {
    "status is 200": (r) => r.status === 200,
    "response time is acceptable": (r) => r.timings.duration < 500,
  });

  sleep(1);
}
