Implementation Plan for GitLab Enterprise Customer Success Dashboard

Goals and Overview

The goal is to build a static dashboard website (deployable on GitHub Pages) that helps GitLab enterprise customers and Customer Success (CS) teams track onboarding progress and value realization. The dashboard will present key customer success milestones (onboarding stages, first value, etc.) alongside adoption metrics (e.g. CI/CD usage, license utilization) drawn from GitLab’s public documentation. By consolidating these indicators, the site will enable enterprise users to visualize their journey from initial onboarding to full GitLab adoption and ROI. Key design objectives include:
	•	Enterprise Focus: Tailor content to enterprise GitLab customers, emphasizing metrics and milestones relevant to large-scale deployments (e.g. percentage of teams/projects using CI, time to first deployment).
	•	Milestone-Based Visualizations: Use repeatable components (progress bars, checklists, or timeline widgets) to represent milestone completion (onboarding done, first CI pipeline, security scans enabled, etc.), allowing quick assessment of progress.
	•	Interactive Onboarding Guides: Incorporate or link to onboarding tutorials and interactive walkthroughs (from GitLab docs or training resources) to accelerate time-to-value for each milestone.
	•	Static Deployment: Ensure the site is a static web app compatible with GitHub Pages (no server needed), using client-side data or build-time data injection for metrics. This ensures easy deployment and maintenance (just push updates to GitHub) while leveraging GitLab’s transparent metrics documentation.

Key Metrics and Milestones

To design the dashboard, we identify core time-to-value milestones and adoption metrics from GitLab’s handbook and docs. These define what “success” looks like during onboarding and ongoing usage. Below are the primary metrics, with definitions drawn from GitLab’s public resources:

Time-to-Value Milestones (Onboarding)

These milestones measure the time from the start of the subscription to key onboarding events ￼ ￼:
	•	Engagement (CSM First Contact): Time from contract start to the first Customer Success Manager meeting. Marks initial engagement; completion is when the CSM holds a first sync with the customer ￼. (Target: within ~14 days ￼ ￼.)
	•	Onboarding Completion: Time until all onboarding tasks are finished. This includes setup steps, basic training, and initial project imports. Completion is when all onboarding checklist items are done ￼ ￼ (Target: ~45 days ￼ ￼).
	•	Infrastructure Ready: Time until the customer’s GitLab environment is fully set up for use. For self-managed, this means production installation is complete; for GitLab.com, the instance is integrated (SSO, etc.) into the customer’s environment ￼. Essentially, the platform is ready for users to start work.
	•	First Value: Measures how quickly the customer achieves initial value from GitLab. GitLab defines “first value” as a small subset of users actively using GitLab in production – specifically when ≥10% of licenses are activated and in use ￼ ￼. Hitting this milestone indicates real work is being done on GitLab (e.g. first project, first repository and CI pipeline by some teams). (Target: ~30 days ￼ ￼.)
	•	Outcome Achieved: Marks delivery of the customer’s original purchase intent or primary use case in GitLab. For example, if the customer bought GitLab for CI/CD, this milestone is reached once CI/CD is fully implemented and providing the expected business outcome. It’s essentially confirming the positive business outcome that motivated the purchase ￼. In GitLab terms, this might correspond to the date the customer’s primary use case turned “green” (successfully adopted) in the success plan ￼ ￼.

Table 1: Key Time-to-Value Metrics and Definitions

Milestone	Definition (Time from start to…)	GitLab Benchmark
Time to Engage	First CSM meeting held with customer ￼.	Goal: 14 days ￼
Time to Onboard	All onboarding tasks completed (platform set up, initial training) ￼ ￼.	Goal: 45 days ￼
Time to Infra Ready	GitLab deployed/integrated into environment (self-managed installed or SaaS configured) ￼.	– (track for visibility)
Time to First Value	10% of licenses actively used by users (initial production use) ￼ ￼.	Goal: 30 days ￼
Time to Outcome	Delivery of original purchase intent (primary use case fully adopted) ￼ ￼.	– (customer-specific)

These milestones form a timeline from onboarding kickoff to full adoption. The dashboard will track each milestone’s status (completed or in progress) and display actual values (e.g. actual days vs target). This highlights where the customer stands in their journey and identifies delays (e.g. if “Time to First Value” exceeds target). For instance, if Time to First Value is 60 days against a 30-day goal, that signals a need to expedite user onboarding or address blockers.

Adoption and Usage Metrics (Value Realization)

Beyond initial onboarding, the dashboard will track adoption metrics that indicate how deeply the customer is using GitLab’s capabilities. These are drawn from GitLab’s Stage Adoption and Use Case Adoption guides, and the Customer Health scoring criteria. Important metrics include:
	•	License Utilization %: The percentage of purchased seats that are actually occupied by active users. This shows how well the customer is leveraging their subscription. First Value is defined at 10% utilization ￼, but we also track higher thresholds (50%, 80%) as milestones ￼. Low utilization is a risk indicator, whereas hitting 80-100% suggests strong adoption (and potential need to expand licenses) ￼ ￼.
	•	Source Code (SCM) Adoption: Whether GitLab is being used as the primary source code management tool. For example, percentage of projects hosted in GitLab repositories, and use of Merge Requests for code review. A customer is considered to have adopted Create/SCM when a significant portion of teams (>40% as a guideline) use GitLab for git repositories and code reviews ￼ ￼. We can track metrics like projects with repositories and monthly commits (from usage ping) – continuous growth over 3 months indicates healthy SCM adoption ￼ ￼.
	•	CI/CD Adoption: The extent to which the customer’s teams use GitLab CI/CD for automation. Key metric: the percentage of projects or teams running GitLab pipelines. GitLab’s handbook suggests that when >25% of projects are using CI, the Verify (CI) stage is “adopted” (beyond pilot) ￼ ￼. The dashboard will show the current CI adoption rate (e.g. 18% of projects have CI pipelines) and mark milestone thresholds (25%, 50%, etc.). We also track runner availability and pipeline frequency – e.g. whether a shared Runner is set up and pipeline counts are growing ￼ ￼. Higher CI/CD adoption correlates with faster delivery, which can be reinforced by also showing DORA4 metrics (see below).
	•	DevSecOps (Security) Adoption: Usage of GitLab’s built-in security scanning and DevSecOps features in the customer’s pipelines. This can be measured by presence of SAST/DAST/Dependency scanning jobs. GitLab considers the Secure stage adopted if one or more security tools are in use with continuous growth over 3 months ￼ ￼. The dashboard might display a count of security scan jobs or the percentage of projects with at least one security scan configured. We can classify adoption levels (e.g. Red/Yellow/Green) based on thresholds – for example, Green if security scans are running in pipelines for >20% of projects (a threshold cited for “healthy” DevSecOps deployment) ￼.
	•	Deployment (CD) Adoption: Whether GitLab is used for releasing/deploying applications. We can show if the customer uses GitLab CI/CD to deploy to environments (tracked by the presence of environments, release evidence, or using features like Feature Flags or Review Apps) ￼ ￼. A milestone might be “First deployment via GitLab” or usage of at least 2 CD features (e.g. using GitLab Environments plus Feature Flags for production) ￼ ￼. Successful adoption here means faster, integrated releases.
	•	User Engagement & Activity: General health metrics such as monthly active users (MAU) or the ratio of active users to total users. If a high percentage of onboarded users are active monthly, it indicates strong engagement. The Customer Health Score methodology aggregates some of these (e.g. license usage, support tickets sentiment, etc.) ￼ ￼. For the dashboard, we will focus on directly observable engagement metrics like MAU or issues/MR activity.
	•	DORA4 Performance Metrics: (Optional, but valuable for “value realization”). DORA4 metrics are industry-standard DevOps KPIs – Deployment Frequency, Lead Time for Changes, Change Failure Rate, and MTTR. GitLab’s Value Stream Analytics provides these out-of-the-box ￼. Including DORA metrics on the dashboard can show the outcomes of adoption: for example, as CI/CD adoption increases, Deployment Frequency should improve. We will surface the organization’s DORA metrics (if available via GitLab Ultimate’s VSA) to benchmark their software delivery performance. This contextualizes value: “Are we shipping faster and more reliably after adopting GitLab?” ￼ ￼. For instance, Time to Value (TTV) in a CI sense is the code release lead time ￼, which should shrink as GitLab usage matures. We will note improvements (e.g. “Lead Time reduced from 2 weeks to 2 days since onboarding”) to celebrate realized value.

Table 2: Sample Adoption & Usage Metrics

Metric	Definition / Measurement	Adoption Indicator
License Utilization	% of purchased seats in active use ￼. Higher is better (10% = first value; aim for 80%+) ￼ ￼.	10% (initial value), 50%, 80% milestones (Green at ≥80%).
SCM Adoption (Create)	Proportion of teams using GitLab for source code (repos & MRs). Tracked via projects with repositories and MR count growth ￼ ￼.	Consider adopted when >40% teams on GitLab code ￼ ￼ (Green).
CI Pipeline Adoption	% of projects running CI pipelines. Also track if Shared Runners set up ￼ ￼.	Milestone at 25% of projects using CI ￼ (adopted); >75% pipelines coverage is ideal ￼ ￼.
Security Scanning	Whether SAST/DAST/Dependency scans are used in pipelines (any usage over last 3 months) ￼ ￼.	Adopted if at least one security tool active (growth trend). Green if ~20% of projects have scans ￼.
CD Deployment	Using GitLab for deployments (tracked via environments, deploy jobs, or features like Review Apps) ￼.	Milestone: first prod deployment via GitLab achieved. Further adoption if multiple teams deploying via GitLab (qualitative).
DORA4 Lead Time	Time from code commit to production release ￼. Shorter is better – indicates rapid value delivery.	Benchmark against industry: Elite performers deploy in hours. Track improvement as GitLab adoption grows ￼.

All these metrics tie back to value realization: higher adoption of GitLab features should correlate with more efficient workflows and better outcomes. The dashboard will present these metrics in an accessible way (charts or gauges), with color-coded statuses (e.g. Red/Yellow/Green) where applicable to quickly show the customer’s health in each area ￼ ￼. For example, a Platform Adoption Score or Use Case Adoption Scorecard could be represented: each major use case (SCM, CI, CD, DevSecOps, etc.) gets a score or progress bar, and the site can roll these up into an overall adoption index ￼ ￼. (Internally, GitLab does something similar with a Platform Adoption Score comprised of multiple use case scores ￼ ￼; our dashboard can expose a simplified version to the customer.)

Dashboard Layout and Visualization Design

The website will be structured into clear sections corresponding to the above metrics, using a logical flow from onboarding milestones through to ongoing usage and outcomes. The design will use responsive, scannable panels with concise text and visuals (charts or icons) to maximize readability.

1. Overview Section: At the top, a summary “scorecard” gives a quick snapshot of the customer’s status. This may include a Milestone Timeline – a horizontal timeline or set of steps for the five key milestones (Engagement, Onboarding, Infrastructure Ready, First Value, Outcome Achieved). Each step will show a status (completed with date, or pending with an expected date/progress). For example, a timeline bar with checkpoints: when a milestone is completed, it turns green with the completion date; upcoming milestones might show as gray or amber if overdue. This provides an at-a-glance view of where the customer is on their journey ￼ ￼. If a milestone is overdue (time-to-value exceeded), it can be highlighted to draw attention.

2. Onboarding Progress Details: A section breaking down the onboarding process into sub-tasks or sub-milestones. This could be a checklist or table of Onboarding Tasks (such as “GitLab installed”, “SSO configured”, “First project created”, “Team training completed”). Each task could have a checkmark or progress indicator (perhaps with a date). This essentially expands on the “Onboarding” milestone by showing which components are done. A completion percentage can be shown (e.g. 8/10 tasks done = 80% onboarding complete). Visualizing this helps identify bottlenecks (e.g. if “import existing repos” is still not done, that might stall time to first value). This section can be presented as a bullet list with checkboxes or a small table. It ties into the first part of the journey and directly relates to Time to Onboard metric.

3. Adoption Metrics Dashboard: The core of the site will be a metrics dashboard with repeatable visualizations for each category of adoption metric. We will use a grid or multi-column layout (for wide screens) and stacked sections (for mobile) to display each major metric in its own panel:
	•	License Utilization Panel: Perhaps a gauge or donut chart showing percentage of seats used. For example, a dial that fills up to the percentage (with segments at 10%, 50%, 100%). We’ll annotate it with the actual numbers (e.g. “160 of 200 seats in use = 80%”). If below a certain threshold, it could be flagged (e.g. red if <50%). This directly shows overall user uptake ￼.
	•	CI/CD Adoption Panel: This might contain multiple sub-metrics. For clarity, we can have a CI Adoption chart – e.g. a progress bar indicating current % of projects with CI. Mark the 25% and 75% targets on the bar for context ￼ ￼. Adjacent to it, a CD/Deployment indicator – maybe a simple icon or text if “Deployments configured: Yes/No”, or a count of deployments. Alternatively, use a combined DevOps Adoption chart (like GitLab’s DevOps Adoption feature) that shows how many of the key features (Issues, MR, Pipeline, Deploy, etc.) have been adopted in at least one project ￼ ￼. For example, a bar chart could list features (Issues, MRs, Pipelines, DAST, etc.) with check marks or counts of groups using them. This allows a quick scan of which capabilities are utilized (mirroring GitLab’s own DevOps Adoption report ￼ ￼).
	•	Security Adoption Panel: A small chart or icon set highlighting security feature usage. Perhaps use icons for each tool (🔒 for SAST, 🐳 for container scan, etc.) colored if in use. Or a single “Security Scans: Yes/No” with details (“Running SAST and Dependency Scanning on 3 projects” for instance). If possible, a trend chart (small sparkline) could show the count of security scans over the last few months to emphasize growth ￼ ￼.
	•	Activity & Outcomes Panel: This part can surface DORA metrics and other outcomes. For DORA, a simple 2x2 grid of metrics with their current values: e.g. Deployment Frequency: 5 per day (Elite), Lead Time: 1 day (Elite), Change Failure: 5% (Elite), MTTR: 2 hours (Elite). If data is available, we can include mini trend indicators (up/down arrows) to show improvement or regression from last period. This panel demonstrates the value realized in terms of engineering performance ￼. If DORA data is not available, we can use other outcome metrics like Cycle Time (similar to lead time), or even business-related outcomes if defined (for example, a metric from the success plan like “% decrease in time to release”).
	•	Health Score Summary (if applicable): Optionally, include a composite Customer Health status. GitLab internally uses a PROVE framework (Product usage, Risk, Outcomes, Voice, Engagement) ￼ ￼. Externally, we might simplify this to an overall status like “Adoption Health: Green” if most metrics are positive. This could simply be a summary line or icon. However, since our focus is on concrete metrics, we may leave formal health scoring internal and instead ensure the various panels collectively illustrate health.

Each metric panel will have a short heading and an icon/graphic. Underneath, a brief description or interpretation can be given (1-2 sentence insight). For example: “CI Adoption: 20% – 20% of your projects ran CI pipelines this month. Aim for 25%+ to consider CI broadly adopted ￼.” We will preserve brevity and use visual emphasis (color coding, icons) to make the data easy to consume without reading heavy text.

4. Tutorials & Guidance Section: After showing what the status is, the dashboard will include a section on how to improve it – essentially an embedded knowledge base for next steps. This section will list Onboarding and Adoption Resources relevant to the metrics above. For instance:
	•	If the security adoption is low, we might have a link: “👉 Learn how to enable SAST in your pipelines”.
	•	If CI adoption is below threshold, include “👉 CI/CD Onboarding Guide” or “Schedule a CI/CD Workshop”.

We will gather these resources from GitLab’s public documentation and handbook. GitLab provides a Customer Success Playbook library and Customer Education materials ￼ ￼ – for example, GitLab Quick Start guides, user webinars, and hands-on labs. The dashboard can highlight a few key ones:
	•	GitLab Onboarding Quick Start (a checklist project to get new customers up to speed – this exists as an internal project but we can adapt its content) ￼.
	•	GitLab Docs – Getting Started: link to docs for setting up projects, CI pipelines, etc.
	•	GitLab Learn (University) courses: e.g. “CI/CD Best Practices” webinar ￼.
	•	GitLab Handbook Guides: e.g. the GitLab Onboarding Guide email series, if any, or the Customer Success Handbook snippets that provide tips (the handbook mentions time-to-value KPIs and reasons to focus on onboarding speed ￼ ￼ which we’ve incorporated).

This section could be formatted as an accordion or list of topics. Possibly even an interactive tutorial widget: for example, an embedded video or an iframe of a walkthrough. We might use a library to create interactive tours (for instance, a guided highlight of features if the user connects their instance data – though with a static site, interactive tours would more likely link out to GitLab’s web application for in-app guides). A simpler approach is linking to relevant sections of GitLab’s official docs (like “DevOps Adoption analytics” documentation ￼ for learning how to enable the DevOps Adoption feature).

Visual Style: The site will follow GitLab’s UX and branding guidelines to feel familiar. We’ll use GitLab’s color palette (e.g. orange for progress, green for success, red for warnings) for consistency ￼ ￼. We can incorporate the GitLab logo or Tanuki mascot subtly in the header. Each section will have a clear heading (using Markdown headings that render to distinct styles). The layout will be mobile-responsive (critical for busy execs checking on a tablet/phone). Using a CSS framework like Bootstrap or Tailwind (included via CDN) could expedite a clean responsive design, or we can utilize a lightweight GitHub Pages theme for simplicity.

To make scanning easy, key numbers will be bold and possibly larger (using HTML/CSS styling) next to explanatory text. Tables and bullet lists (like we have above) will be used to structure information clearly where appropriate (e.g. listing tasks or metrics). The overall UI should be that of a one-page dashboard with anchor links to sections (we can include a sidebar or top navigation for “Onboarding” vs “Adoption” if the content is lengthy).

Onboarding Tutorials and Interactive Walkthroughs

A major requirement is to incorporate onboarding tutorials or interactive walkthroughs into the site. Since the dashboard itself is static, we will leverage external content and client-side scripts for interactivity:
	•	Contextual Help Links: Throughout the dashboard, next to each metric or milestone, we will place small “help” icons or links that point to relevant documentation. For example, next to the CI adoption metric, a link: “How to increase CI adoption?” could lead to a GitLab Docs page on CI/CD or a blog post about CI best practices. GitLab’s handbook and blog have articles (e.g. “Four CI metrics you should follow” which covers time to value and CI efficiency ￼ ￼) that can be linked as educational pieces. We will identify at least one helpful link per major area:
	•	Onboarding: link to the GitLab Onboarding Guide (if public) or a quick start in docs.
	•	CI/CD: link to GitLab CI/CD tutorial (for instance, GitLab Docs has a CI/CD Quick Start).
	•	DevSecOps: link to setting up SAST/DAST docs.
	•	Value Stream Analytics: link to guide on using GitLab’s VSA and understanding DORA metrics.
These act as self-serve tutorials for customers to follow and improve their usage.
	•	Embedded Media: We can embed short videos or GIFs demonstrating key steps. For example, an embedded YouTube video from GitLab’s channel (such as “GitLab CI Pipeline Tutorial” or a snippet from GitLab Learn) could provide an interactive walkthrough feel. GitLab often has “GitLab 101” or demo recordings; we’ll ensure any embedded video is publicly accessible. A YouTube embed for, say, “Getting started with GitLab” can play directly on the page.
	•	Interactive Walkthrough Scripts: For a more hands-on approach, we might integrate a JavaScript library to create a guided tour within the dashboard. For instance, using a library like Intro.js or Shepherd.js, we could create a click-through tutorial that highlights parts of the dashboard itself or instructs the user to perform certain tasks (though performing tasks would actually be in their GitLab instance, outside our static site’s scope). However, given the static nature, a realistic approach is to use the dashboard as a launchpad: it might say “Ready to onboard your next team? Start the interactive in-app onboarding in GitLab” and provide a link that triggers GitLab’s in-app help (GitLab has in-product tours for new users which we could reference).
	•	Downloadable Guides or Templates: We can offer links to GitLab CS Tools like the Onboarding Quick Guide project ￼. For example, a button “📋 Get Onboarding Checklist” could link to a GitLab project template that the customer can import. This leverages GitLab’s own project as a checklist (the one that “accelerates your time-to-value with GitLab” ￼). Similarly, if there are Success Playbooks (like the CI/CD Workshop or Security onboarding playbook) publicly available, we link to those ￼ ￼.
	•	FAQ/Support Pointers: We will include a short FAQ for common issues (e.g. “What if our First Value milestone is delayed?”) with answers like “Engage your GitLab Technical Account Manager or check our troubleshooting guide.” Possibly link to community resources (forums or support portal) as well, so users know where to get help.

All tutorial content will be client-side only (no server calls required to fetch these), which means mostly linking out or embedding. The interactive elements we add (videos, possibly a guided tour script) should all be usable within a static page. We must also ensure not to clutter the dashboard: tutorials will likely be in a collapsible section or at the bottom once the user has seen their data. The emphasis is on actionable guidance – after seeing a metric, the user can immediately find out how to improve it via the provided tutorial.

As a concrete example, suppose the Security Adoption metric shows “No SAST scans yet.” Right below, we could have a callout: “👣 Next Step: Enable Secure testing – [Follow this guide to add SAST to your pipeline] ￼.” This link goes to GitLab docs explaining how to include SAST in .gitlab-ci.yml. By weaving these links in, the dashboard itself becomes not just a reporting tool but a learning tool (almost a mini-portal for success enablement).

Technical Implementation Details

Static Site Generator: We will choose a static site generator and framework that works well with GitHub Pages. GitHub Pages has native support for Jekyll, which is a very common choice ￼ ￼. Using Jekyll allows us to write content in Markdown (and the above report is already in Markdown) and generate a polished site easily. It also supports Liquid templating which we can use to inject data values and create repetitive components for milestones, etc ￼ ￼. Jekyll builds can run automatically on GitHub Pages, meaning we can just push the source and let GitHub build it ￼. This simplifies deployment (no CI needed for building, unless we choose a different generator).

Alternatively, we could consider Hugo (a fast Go-based SSG) or Eleventy (JavaScript-based) if we want more flexibility or faster builds. These would require using GitHub Actions to build and publish to Pages (since GitHub Pages by default only auto-builds Jekyll). Another modern option is Docusaurus (which uses React and Markdown, often for documentation sites). Docusaurus could be helpful if we want a structured docs-like site with versioning, but for a single dashboard page it might be overkill.

If we require more dynamic interactivity (like embedding React components for charts), we could use a React-based static site approach. For example, Gatsby or Next.js (with next export for a static export) could let us create a richer UI. A React framework would allow us to use component libraries for charts or reuse interactive components. However, using React might introduce complexity (needing Node builds, etc.) unless we have a strong reason (like complex stateful UI). Given our use case – mostly displaying data and linking resources – a simpler Jekyll or Hugo site augmented with some JavaScript for charts is likely sufficient.

Front-End Libraries: For visualizations, we can leverage client-side JavaScript libraries:
	•	Charting Libraries: Chart.js (simple and good for gauges, bar charts) or D3.js (powerful for custom visuals) can be embedded. For example, Chart.js can draw a doughnut chart for license utilization or a line chart for trends with just a <canvas> element and a few lines of JS. These charts can be rendered at page load using static data embedded in the page (or fetched from a JSON file in the repo). The data itself (numbers like 20% CI adoption) might be updated manually or via an automated script when new usage ping data is available. Since the site is static, one approach is to store metrics in a YAML/JSON and have Jekyll read it into the page at build time, so updating the data is just updating that file.
	•	Interactive UI Components: We will use basic HTML/CSS for accordions or tabs (possibly with a sprinkle of Vanilla JS or a lightweight library). For example, showing/hiding the tutorial section could be done with a few lines of JS or using the <details> and <summary> HTML elements for a built-in collapsible effect.
	•	Frameworks/CSS: If we use Jekyll, we can pick a minimal theme or write custom CSS. GitHub Pages offers themes that come with some style; we might use one as a base (e.g. Cayman or Minimal). Otherwise, using a utility-first CSS like Tailwind could speed up styling (but that requires a build step). We can also include the Bootstrap CSS from a CDN to utilize its grid system and components for layout (e.g. using its progress bars classes or columns for responsiveness ￼ ￼). However, too heavy a framework might not be needed; a custom CSS file with a few classes for grids might suffice given the limited scope.
	•	Icons: We can use an icon library (like FontAwesome or GitLab’s SVG icons) for visual cues (checkmarks, warning symbols, etc.). For performance, inline SVGs or an icon font can be used.

Data Management: The dashboard’s data (like current percentages, dates achieved, etc.) could be maintained in a structured format within the repository:
	•	We can have a YAML file (e.g. _data/metrics.yml if using Jekyll) that contains all the metric values for the customer. The Jekyll templates can read from this to populate the numbers in the HTML ￼. This way, updating the dashboard doesn’t require editing the HTML – one can update the YAML (perhaps via an automated script that pulls data from GitLab’s APIs or from an export) and push changes to regenerate.
	•	If automation is desirable, we could write a script to fetch usage ping data from the customer’s GitLab (if they export it) and update the JSON. However, that may be outside scope; initially, manual or periodic updates are fine given the static nature.
	•	Another approach: store metrics in JavaScript variables in a separate file (metrics.js) and have the page’s JS render the values into the DOM. But this is more complicated than using Jekyll’s native data binding.

Example Milestone Logic Implementation: To illustrate how we’ll implement milestone checks in code, consider using Liquid templating in Jekyll or simple JS conditions. For instance, we might define in YAML:

ci_adoption: 0.20  # 20%
ci_adoption_target: 0.25  # 25% target

Then in Jekyll template:

{% assign ci_pct = site.data.metrics.ci_adoption | times: 100 %}
CI Adoption: **{{ ci_pct | round: 0 }}%** 
{% if site.data.metrics.ci_adoption >= site.data.metrics.ci_adoption_target %}
<span class="label success">Milestone Achieved</span>
{% else %}
<span class="label pending">In Progress (Target 25%)</span>
{% endif %}

This would output something like “CI Adoption: 20% – In Progress (Target 25%)” and if it was 30%, it would show a “Milestone Achieved” label in green. Similar logic can be applied for other metrics (e.g. if license_utilization >= 0.1, mark first value achieved). We can create a small table or list in the page summarizing milestone statuses using such conditionals.

Below is a table demonstrating example milestone tracking logic that we will incorporate (the actual implementation will use code as above, but here it’s described conceptually):

Milestone / Goal	Tracking Logic (pseudo-code)	Display Outcome (Example)
First Value (10% seats)	if (active_users / total_licenses >= 0.10) then achieved ￼.	Mark “First Value Achieved” with date (e.g. reached on Day 20).
CI Adoption 25%	if (ci_enabled_projects / total_projects >= 0.25) then CI milestone achieved ￼.	If achieved, show green check “CI Adopted”; else show progress bar at X% with note “25% target”.
Security Scan Enabled	if (security_scans_last_30d > 0) then Security milestone achieved. (Optionally require growth trend) ￼.	Show checkmark if any project has SAST/DAST running; if not, display “Not yet enabled” in red.
License Utilization 50%	if (active_users / total_licenses >= 0.50) then reached 50% milestone.	Gauge chart segment turns from amber to green once ≥50%. (If below, perhaps amber warning icon.)
Outcome (Use Case) Green	if (primary_use_case_status == "Green") then Outcome Achieved. (In practice, “Green” might mean all key adoption metrics for that use case met) ￼ ￼.	If the success plan’s primary metric is met, display trophy icon “Primary Goal Achieved”. Otherwise, show which metrics are still needed.

Each of these rules will be implemented either in the site generator (for static checks at build time) or via a small script on the client. Given that the data is static for a particular snapshot, build-time checks are fine.

GitHub Pages Deployment: We will host the site on GitHub Pages, either as a user/organization site or a project site. The repository can be private or public (if we’re sharing openly with the customer, public is fine as no sensitive data is included – it’s all high-level metrics). Using Jekyll on Pages is straightforward: simply push to the gh-pages branch or the special username.github.io repo, and GitHub Pages will build it. Jekyll’s built-in support on Pages means we don’t have to containerize or anything ￼. If we choose a non-Jekyll SSG (like Hugo), we would use GitHub Actions to build and publish the static files to the gh-pages branch on every update.

We also plan to use custom domains or access control if needed (for example, if this dashboard should not be publicly visible, we might make the Pages site private behind GitHub authentication, or simply not publish it publicly). GitHub Pages itself doesn’t support auth, so an alternative is to host the static site on GitLab Pages (since the audience is GitLab customers, we might ironically consider GitLab Pages for private access, but let’s stick to the requirement of GitHub Pages for now). If privacy is a concern, we could host as a static site on an internal network instead.

Framework/Library Summary: To recap, our recommended stack is Jekyll (for static generation, due to GitHub Pages integration) with Markdown content and Liquid templates, enhanced by Chart.js for visualizations and lightweight JS for any interactivity. This approach keeps things simple, maintainable, and aligned with GitHub Pages’ strengths ￼ ￼. However, we remain open to using a React-based static framework (e.g. Gatsby) if during implementation we find a need for more complex state management (for example, if we allow the user to input some filter or scenario and update charts on the fly, which currently is not in scope). Given the primarily report-like nature of the dashboard, we don’t foresee heavy interactivity that warrants a full single-page app framework.

Performance Considerations: All assets (JS/CSS) will be included such that the site loads quickly even on corporate networks. Charts will be rendered client-side but data sets are small (just a handful of metrics), so performance impact is negligible. We will test on modern browsers and ensure degrade gracefully (e.g. if JS is off, the user can still see the raw numbers and links – charts might not render but data in text form would still be provided as fallback).

In summary, the technical plan is to leverage GitHub Pages + Jekyll for static content generation ￼, incorporate dynamic visuals via Chart.js and progressive enhancement, and structure the site’s content in a maintainable way (using data files and templates). This results in a scalable, repeatable solution: the structure can be reused for multiple customers (just swap out the data file for each) and the site can be extended with new metrics or sections by modifying the templates.

Content Structure and Example Milestone Logic

The content will be organized in a hierarchical, handbook-style structure (similar to how GitLab’s Handbook pages are structured, to maintain familiarity). High-level structure:
	•	Home Page (Dashboard Main) – This is the primary dashboard view containing all sections described (Overview, Onboarding, Adoption, Tutorials). It might be a single page with anchors, since it’s meant to be a one-stop overview. If it grows too large, we could split some parts into subpages, but initial plan is one page for simplicity.
	•	Data Files – e.g. /_data/metrics.yml containing keys like time_to_engage: 11 (days), license_utilization: 0.8, etc., representing the current state for the given customer. This keeps content and data separate.
	•	Assets – directories for css/, js/, images/ as needed. We will include any logos or custom graphics here (for example, maybe a GitLab logo or icons if not using CDN).
	•	Tutorial Pages (optional) – If we find it useful, we can create separate pages for detailed tutorials or use existing ones. However, since official docs exist, likely we won’t duplicate content. We might have a page like getting_started.md summarizing all resources, but more likely we just link outward.
	•	Templates/Includes – Common components (like a milestone card or a metric panel) can be abstracted as include files in Jekyll. For instance, _includes/milestone.html could generate a milestone item given name, status, date. This makes the page structure easier to maintain and consistent (repeatable patterns as required).

The site navigation (if any) will be minimal – perhaps just a header with the company name and maybe links to sub-sections (like “#onboarding”, “#adoption”, etc.). In a dashboard, heavy navigation isn’t needed since it’s mostly a single view.

We have demonstrated above how milestone logic can be implemented. To ensure clarity, here’s an example scenario of how the content might be presented to a user, tying everything together:

Onboarding Milestones:
✅ Engagement: CSM intro call held on 2025-09-01 (in 5 days, beating 14-day goal) ￼ ￼.
✅ Onboarding Complete: All initial tasks done by 2025-10-10 (45-day target met) ￼.
⚠️ First Value: 8% licenses used so far – nearly there! Expected by 2025-10-15. (Aim for 10% = ~50 of 500 seats) ￼.
⬜ Outcome Achieved: In progress. Primary goal is CI/CD deployment pipeline for all teams – currently ~30% teams onboarded to CI. Target 100% by Q4.
(Next step: see “CI Adoption” below for details on scaling CI to more teams.)

Adoption Metrics:
– License Utilization: 40% (200/500 seats active). Moderate adoption. (Consider training more teams. ⭐ First 10% achieved in 30 days, great! Next milestone: 50%.)
– CI/CD Adoption: 30% projects with CI pipelines (Green) – Achieved initial CI adoption milestone! ￼ Most teams have a runner setup ￼. Deployment to staging in 5 projects, and to prod in 2 projects (pilot phase).
– DevSecOps: SAST scanning enabled in 2 projects (10% of projects). Status: Yellow – some adoption. No DAST yet. (Recommendation: enable Container Scanning – see guide below.)
– Lead Time (DORA): 1 day from commit to deploy (good). Deployment Frequency: On-demand (when ready, ~daily) ￼. Change Failure Rate: ~10% (some failures). MTTR: ~4 hours. Overall: making progress towards elite DevOps performance.

This mock-up shows a mix of text, icons (we used emoji just for illustration: ✅, ⚠️, etc.), and the references to actual numbers. The actual site would render these nicely with icons and colored labels rather than emoji. It also references the tutorials implicitly (“see guide below”).

After such data, the Tutorials section might look like:

Next Steps & Resources:
• Expand CI to more teams – Read: CI/CD Adoption Workshop￼ – a step-by-step playbook for rolling out CI across development teams ￼.
• Enable Security Scans – Learn: Setting up SAST/DAST in GitLab CI￼ – how to integrate security scans into your pipelines. By doing this, you’ll move towards “Secure” stage adoption (a key milestone) ￼.
• GitLab Training – Watch: GitLab Onboarding Webinar￼ – an on-demand webinar covering initial setup, GitLab flow, and achieving first value (hosted by GitLab’s customer success team) ￼.
• Value Stream Analytics – Try: Enable the DevOps Adoption feature on your GitLab instance to track feature usage per group ￼. This can give deeper insight and is the same data we use in this dashboard. See Analytics > DevOps Adoption in your GitLab UI ￼.

Each bullet offers an actionable link, with a brief description of why it’s relevant (tying back to improving the metric). By following these, the customer can progress on their own. In a way, the static dashboard combined with these resources forms a self-service coaching tool.

Finally, to maintain clarity, we will include citations (as footnotes or hoverable references) on the site if appropriate (since this is a customer-facing site, we might not show raw URLs but could say “(Source: GitLab Handbook)” with a tooltip). The important part is that all definitions we present are rooted in GitLab’s official definitions (as we have done with the citations in this planning document). If needed, an “About these metrics” section can explain that these are based on GitLab’s public handbook and that they align with how GitLab’s Customer Success team measures success ￼ ￼. This transparency can build trust that the metrics are not arbitrary but industry-proven.

⸻

By implementing the above plan, we will deliver a comprehensive, user-friendly dashboard that not only reports on an enterprise customer’s onboarding and adoption status, but also provides guidance to accelerate progress. The static architecture on GitHub Pages ensures the solution is low-maintenance and easily repeatable, while the content is deeply informed by GitLab’s own best practices and terminology (e.g. time-to-value KPIs, DevOps adoption, success plan outcomes). This alignment with GitLab’s public documentation – from the Stage Adoption criteria to DORA metrics – ensures that enterprise users and GitLab’s Customer Success managers have a single source of truth for tracking and realizing value with GitLab ￼ ￼.

Sources:
	•	GitLab Handbook – Customer Success and CSM Onboarding pages ￼ ￼ ￼ ￼ (definitions of time-to-value milestones).
	•	GitLab Handbook – Stage Adoption and Use Case Adoption Scoring ￼ ￼ ￼ (adoption metrics and thresholds for various stages).
	•	GitLab Docs – DevOps Adoption analytics ￼ ￼ (feature adoption metrics by category), and GitLab blog on CI metrics ￼ ￼ (importance of cycle time, TTV).
	•	GitHub Docs – GitHub Pages & Jekyll ￼ ￼ (for static site setup on GitHub Pages, confirming Jekyll support).
	•	GitLab Value Stream Management page ￼ (mention of DORA4 metrics for DevOps performance benchmarking).