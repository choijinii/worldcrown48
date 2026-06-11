---
title: Privacy Policy
type: privacy
lang: en
lastUpdated: 2026-06-11
version: 1.0
---

# Privacy Policy

**Last updated: June 11, 2026 · Effective date: June 11, 2026**

WorldCrown48 ("WC48", "we", "the Service") treats user personal data with care and complies with the EU General Data Protection Regulation (GDPR), Korea's Personal Information Protection Act (PIPA) and the Network Act, the UK Data Protection Act, the U.S. COPPA, and other applicable laws.

This Policy explains what personal data WC48 collects, the purposes of collection and use, retention periods, third-party sharing and international transfers, and your rights as a user.

> ⚠️ **Legal review in progress**: This Policy was drafted based on standard best practices and may be updated after prior notice in line with legal review and future changes in law.

---

## 1. Personal Data We Collect

### 1.1 Information you provide directly

| Item | When collected | Required |
|---|---|---|
| Email address | Sign-up · Waitlist | Required |
| Nickname (Voter Name) | Sign-up | Required |
| Profile image (avatar) | When uploaded by the user | Optional |
| Preferred categories (football, K-pop, etc.) | When set by the user | Optional |
| Report reason for content | When reporting | Required |

### 1.2 Information collected automatically

| Item | Method | Storage form |
|---|---|---|
| IP address | When connecting to the server | **Hashed (SHA-256)** |
| Browser · OS info | User-Agent header | Plain text |
| Access timestamps · page history | While using the Service | 14 months |
| Voting history (Tournament · Match · Contestant) | When the user votes | Permanent (anonymized) |
| Cookie consent record | When saved through the consent modal | 12 months |

### 1.3 Information from third-party authentication

When using social login (Google, Apple, etc.), we receive the following from the provider:

- Email address (required)
- Profile picture (optional, if you allow)
- Unique identifier (uid)

**We do not receive your password, contacts, friend list, or social media activity history.**

---

## 2. Purposes and Legal Bases

WC48 collects and uses personal data for the following purposes.

| Purpose | Data | Legal basis (GDPR) | Retention |
|---|---|---|---|
| Account identification · login | Email · uid · nickname | Contract performance (Art. 6(1)(b)) | Until account deletion |
| Voting · Tournament participation | Voting history · Contestant ID | Contract performance | Permanent (anonymized) |
| Service operation · security | Hashed IP · access logs | Legitimate interest (Art. 6(1)(f)) | 14 months |
| Abuse prevention | Hashed IP · multi-account patterns | Legitimate interest | 12 months |
| Analytics · improvement (optional) | Page navigation · time on page | **Consent** (Art. 6(1)(a)) | 14 months |
| Marketing (optional) | Preferred categories · email | **Consent** | Until consent withdrawn |
| Legal compliance | Consent records · report files | Legal obligation (Art. 6(1)(c)) | 5 years |

Analytics and marketing apply only when you have consented in the [Cookie Policy](/policies/cookies).

---

## 3. Retention Periods

- **Account information**: Deleted within 30 days of account closure (data subject to legal retention is stored separately for the required period)
- **Voting history**: **Anonymized and stored permanently** for analytics and service operation (no individual identification possible)
- **Access · security logs**: 14 months (Korea Protection of Communications Secrets Act)
- **Reports · complaints**: 5 years (E-Commerce Act + dispute response)
- **Cookie consent records**: 12 months (GDPR best practice)

---

## 4. Sharing with Third Parties

WC48 does not share personal data with third parties except in the following cases.

1. When the user has consented in advance
2. When required by law or by a legitimate request from law enforcement
3. When processed in a form that **cannot identify individuals**, for statistical or research purposes

---

## 5. Processors and International Transfers

To run the Service reliably, WC48 uses the following processors. Some data may be transferred outside Korea.

| Processor | Service | Location | Safeguards |
|---|---|---|---|
| Google Firebase (Google LLC) | Auth · database · analytics | U.S. + global multi-region | GDPR Standard Contractual Clauses |
| Vercel Inc. | Web hosting · serverless functions | U.S. + global edge | GDPR SCCs |
| Cloudflare Inc. | CDN · DDoS protection · email routing | Global edge | GDPR SCCs |
| Google LLC (Analytics 4) | Usage statistics (with consent) | U.S. + EU | GDPR SCCs + IP anonymization |

You may object to international transfers, but doing so may limit access to core features (login, voting, etc.).

---

## 6. Your Rights

Regardless of where you reside (EU, UK, Korea, etc.), you may exercise the following rights.

| Right | Description | How to exercise |
|---|---|---|
| **Right of access** | Review your personal data processing | Account settings or [policy@](mailto:policy@worldcrown48.com) |
| **Right to rectification** | Correct inaccurate data | Account settings |
| **Right to erasure** ("right to be forgotten") | Request deletion of your data | Close account + [policy@](mailto:policy@worldcrown48.com) |
| **Right to restrict processing** | Pause specific processing | [policy@](mailto:policy@worldcrown48.com) |
| **Right to portability** | Download your data in a standard format | [policy@](mailto:policy@worldcrown48.com) |
| **Right to object** | Refuse marketing or profiling | Cookie settings + account settings |
| **Right to withdraw consent** | Withdraw consent for analytics or marketing | Cookie settings |
| **Right to object to automated decisions** | Request exclusion from automated decision-making | [policy@](mailto:policy@worldcrown48.com) |

WC48 responds to rights requests **within 30 days**.

---

## 7. Protection of Minors

- The minimum age to sign up for WC48 is **14 years** (Korea Network Act + U.S. COPPA standard)
- If we learn that a user under 14 has signed up, the account and related data are **deleted immediately**
- Parents or guardians who wish to inquire about or delete their child's data should contact [policy@](mailto:policy@worldcrown48.com)
- Content involving minors is handled in line with [Community Guidelines §2.2](/policies/community#2.2)

---

## 8. Security Measures

WC48 implements the following technical and organizational measures to protect personal data.

- **Transport encryption**: All communication is encrypted with TLS 1.3 or higher
- **Storage encryption**: Passwords use bcrypt hashes; IPs use SHA-256 hashes
- **Access control**: Firebase Security Rules enforce per-user access permissions
- **Principle of least privilege**: Operators access only the minimum data needed for their work
- **Backups**: Firebase automated backups; the same security standards apply to backup data

---

## 9. Data Breach Notification

In the event of a personal data breach, WC48 follows the procedure below.

- **Upon detection**: Scope and cause identification; further damage contained
- **Within 72 hours**: Notification to affected users via email (GDPR Art. 33·34)
- **Within 72 hours**: Notification to the relevant supervisory authorities (EU DPA, Korea KISA · PIPC)
- **Post-incident**: Root-cause analysis and prevention measures published in the announcements section

---

## 10. Automated Decision-Making and AI Processing

WC48 may perform the following automated processing.

- **Tournament recommendations**: Exposure of Tournaments based on user preferred categories (only with marketing-cookie consent)
- **AI-Report**: AI-generated content analyzing Tournament results ([Footer-Only Lock per Design System v2.4](/policies/terms#5.3))
- **Abuse detection**: Automatic detection of multi-account and bot patterns

You may request to be excluded from automated decision-making, though some features may then be limited.

---

## 11. Cookies

For details on cookie use, please refer to the [Cookie Policy](/policies/cookies). You may change your cookie consent at any time through the "Reopen cookie preferences" link at the bottom of any page.

---

## 12. Data Protection Officer

| Role | Details |
|---|---|
| Data Protection Officer | WorldCrown48 Representative |
| Contact | [policy@worldcrown48.com](mailto:policy@worldcrown48.com) |
| EU Representative | To be appointed and announced once EU traffic grows materially |

EU residents may file complaints directly with their national data protection authority (DPA).
Korean residents may file complaints with the Personal Information Protection Commission (privacy.go.kr) or the Korea Internet & Security Agency (privacy.kisa.or.kr).

---

## 13. Changes to This Policy

This Policy may be updated due to changes in law, service expansion, or new processors.

- **Material changes**: announced at least **30 days** before the effective date
- **Minor changes**: reflected by updating the "Last updated" date at the top of this page
- Channels: in-service announcements, email, and re-display of the consent modal

---

## 14. Contact

| Type | Channel |
|---|---|
| Policy · legal inquiries | [policy@worldcrown48.com](mailto:policy@worldcrown48.com) |
| Content reports | [report@worldcrown48.com](mailto:report@worldcrown48.com) |
| General inquiries | [hello@worldcrown48.com](mailto:hello@worldcrown48.com) |
| Response time | Within 7 business days (30 days for rights requests) |

---

*This policy may be updated after prior notice in response to legal or service changes.*
*© 2026 WorldCrown48 · Privacy Policy v1.0*
