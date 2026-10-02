# eTermin API

The booking system (`site.booking_url`) runs on eTermin. Claude Code accesses it through
`scripts/etermin.js` (no dependencies, Node ≥ 18).

- Overview: https://www.etermin.net/online-terminplaner-api
- Full reference (OpenAPI 3): https://app.swaggerhub.com/apis-docs/etermin.net/eTermin-API/
  (raw spec: `https://api.swaggerhub.com/apis/etermin.net/eTermin-API/1.0.0`)

## Setup

Create `.env.etermin` in the repo root (gitignored, never commit it):

```
ETERMIN_PUBLIC_KEY=...
ETERMIN_SECRET_KEY=...
```

Keys are in eTermin under *Einstellungen → Integration → API*.

## Usage

```bash
node scripts/etermin.js <GET|POST|PUT|DELETE> <resource> [key=value ...] [--yes]
# or: npm run etermin -- GET calendar
```

- Base URL `https://www.etermin.net/api/<resource>`; all parameters are sent as query parameters.
- Auth headers per request: `publickey`, `salt` (random), `signature` = base64(HMAC-SHA256(secret, salt)).
- **Writes (POST/PUT/DELETE) are a dry run unless `--yes` is passed.** Claude must confirm
  with the user before sending any write — it changes real customer bookings.
- Deleting appointments can notify customers (`sendemail`, `msgtype` params) — check before deleting.

## Resources

| Resource | Methods | Purpose / key params |
|----------|---------|----------------------|
| `appointment` | GET POST PUT DELETE | Appointments. GET: `start`, `end`, `calendarid`, `email`, `id`. POST requires `start`, `end`, `calendarid` |
| `appointmentdeleted` | GET | Deleted appointments (`start`, `end`) |
| `timeslots` | GET | Free slots: `date` (required), `serviceid`, `calendarid`, `rangesearch`, `end` |
| `calendar` | GET POST PUT DELETE | Calendars (= staff/resources) |
| `calendarservice` | GET POST DELETE | Services assigned to a calendar (`calendarid`) |
| `servicecalendar` | GET | Calendars offering a service (`serviceid`) |
| `calendarsnonworkingtimes` | GET POST PUT DELETE | Absences/holidays: `appcalendarid`, `startdate`, `enddate`, `reason` |
| `workingtimes` | GET POST PUT DELETE | Weekly working hours per calendar (`calendarid`, `weekday`, `start`, `end`) |
| `workingtimesdate` | GET POST PUT DELETE | Date-specific working hours (overrides weekly) |
| `anchortime`, `anchortimedate` | GET POST PUT DELETE | Fixed start times |
| `calendarreturntime` | GET POST PUT DELETE | Return times |
| `service` | GET POST PUT DELETE | Services (`servicegroupid`, `servicede`, `timeslotminutes`) |
| `servicegroup` | GET POST PUT DELETE | Service groups |
| `contact` | GET POST PUT DELETE | Customers (`email`, `cid`) — personal data, GDPR |
| `contactfrequency`, `contactservice` | GET POST | Customer booking limits / permissions |
| `voucher` | GET POST PUT DELETE | Vouchers |
| `rating` | GET | Customer ratings |
| `surveyresults` | GET | Survey results (`date`, `appid`) |
| `messagelogs` | GET | Sent e-mails/SMS (`appid`) |
| `bookingpagelogs` | GET | Booking page requests (`datefrom`) |
| `usermapping` | GET POST PUT DELETE | User mappings |
| `appointmentsync` | GET POST PUT DELETE | Calendar sync (`synctoken`) |

For exact parameters of a resource, read the raw spec, e.g.:

```bash
curl -s https://api.swaggerhub.com/apis/etermin.net/eTermin-API/1.0.0 \
  | python3 -c "import json,sys;s=json.load(sys.stdin);print(json.dumps(s['paths']['/api/timeslots'],indent=1))"
```

## Privacy

Responses contain customer personal data (names, e-mail, phone). Don't write it into the
repo, commits, PRs or Jira tickets.
