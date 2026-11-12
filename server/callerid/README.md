# Loop Me caller lookup service

The service behind **Who is calling** (Live Caller ID Lookup, iOS 18). When a
call comes in, the iPhone asks this service about the number using Private
Information Retrieval: the query is encrypted with homomorphic encryption and
the server answers it without ever learning the number. The service is Apple's
own open-source `PIRService`; this folder holds the dataset builder, the
configuration and the run script.

What the phone shows: **"Reported scam caller · 412 reports"** for numbers in
the dataset, nothing for numbers that are not. Loop Me never invents a name.

## The dataset

`build-dataset.mjs` pulls the FTC's public Do Not Call complaint data
(numbers people in the US reported for unwanted or robocalls, released every
weekday) plus the numbers Loop Me users blocked and chose to share, and writes
`input.txtpb` in the format `ConstructDatabase` expects. A number must have
been reported at least `MIN_REPORTS` times (default 3) in the window
(default 30 days) to be labeled, and `MIN_BLOCK` times (default 25) to be
blocked outright.

```sh
export FTC_API_KEY=...        # free, https://api.data.gov/signup/
node build-dataset.mjs        # writes input.txtpb, prints counts
```

The test identity Apple requires for onboarding (+14085551212, "Johnny
Appleseed") is included automatically.

## One-time setup on the server

Any Linux box or Mac with Swift 6.1. Apple's instructions are in
`live-caller-id-lookup-example` (Sources/PIRService/PIRService.docc).

```sh
export PATH="$HOME/.swiftpm/bin:$PATH"
git clone https://github.com/apple/live-caller-id-lookup-example && cd live-caller-id-lookup-example
swift package experimental-install -c release --product ConstructDatabase
swift package experimental-install -c release --product PIRService
cd .. && git clone https://github.com/apple/swift-homomorphic-encryption && cd swift-homomorphic-encryption
swift package experimental-install -c release --product PIRProcessDatabase
```

## Build and run

```sh
./run.sh            # builds the two PIR databases from input.txtpb and starts the service on :8080
```

`run.sh` can be rerun every day from cron; it rebuilds and sends the service
`SIGHUP` so it reloads without dropping clients.

## Going live (what Apple requires)

1. Two HTTPS subdomains, no paths, no ports: `lookup.loopmescamsafety.app`
   (service) and `issuer.loopmescamsafety.app` (token issuer). Both can point
   at the same PIRService behind a reverse proxy with HTTP/2 and a real
   certificate.
2. A DNS TXT record on the service host:
   `apple-live-caller-id-lookup=com.loopmescamsafety.app.callerid`
3. An Oblivious HTTP gateway in front of it, and the onboarding form on the
   Identity & Trust page of the CloudKit console
   (https://icloud.developer.apple.com/dashboard/identity). Until Apple
   approves, the feature works only for builds installed from Xcode.
4. The user token in `service-config.json` must match the one in
   `ios/CallerID/CallerID.swift` (`TG9vcE1lLXB1YmxpYw==` = "LoopMe-public").
   Change both together before going live.

## While testing from Xcode

Run the service on your Mac, then in `ios/CallerID/CallerID.swift` set both
URLs to `http://<your-mac-hostname>.local:8080` and rebuild. Settings › Apps ›
Phone › Call Blocking & Identification › Loop Me (under Call Identification).
Ring the phone from a number in `input.txtpb` and the label appears before it
rings.
