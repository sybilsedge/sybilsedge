export const skills = {
	'Cloud & Architecture': [
		'Google Cloud Platform (GCP)',
		'AWS', 'Azure',
		'Hybrid Cloud & Multi-Cloud Connectivity',
		'Terraform', 'Ansible / AWX',
		'CI/CD (GitHub Actions, CircleCI, Jenkins)',
		'Helm / Kubernetes',
	],
	'Networking': [
		'BGP / OSPF / VXLAN EVPN',
		'Cisco ACI / Nexus (VDC/vPC)',
		'SD-WAN (VeloCloud / Cato / Peplink)',
		'Data Center Modernization',
		'Juniper Mist / Cisco WLC',
	],
	'Security & Governance': [
		'Zero-Trust Architecture',
		'SOC2 / NIST 800-53 / NIST 800-171',
		'IAM (Okta / Lumos)',
		'FortiGate / Palo Alto / Cisco ISE',
		'DISA STIG',
	],
	'Observability': [
		'Prometheus / Grafana',
		'OpenTelemetry',
		'Gigamon Network TAPs / Brokers',
		'Viavi Observer',
		'Wireshark',
	],
	'Development': [
		'Python', 'GoLang',
		'TypeScript', 'Astro', 'React',
		'Infrastructure-as-Code',
		'NetBox / CMDB Automation',
	],
};

export const experience = [
	{
		title: 'Senior Solution Architect',
		org: 'Current Employer',
		period: 'Jul 2022 — Present',
		bullets: [
			'Core Security & IT representative on the Architecture Review Board; pioneered adoption of Architecture Decision Records (ADRs).',
			'Architected GCP Shared VPC strategy with hybrid connectivity via Cloud Interconnect and Cloud VPN for SD-WAN integration; designed a FedRAMP-mirrored Sandbox for government-adjacent workloads.',
			'Standardized Terraform and CI/CD pipelines; migrated 100% of legacy cloud and network assets into state-managed IaC.',
			'Engineered a synchronization engine between NetBox, Jira Assets CMDB, and cloud platforms using custom Python; automated device re-provisioning from CMDB metadata.',
			'Designed multi-tier observability framework using Prometheus, Grafana, and OpenTelemetry.',
			'Led alignment of cloud architecture with SOC2, NIST 800-53, and 800-171; implemented zero-trust IAM using Okta and Lumos.',
		],
	},
	{
		title: 'Principal Technical Architect',
		org: 'Healthcare',
		period: '2018 — 2022',
		bullets: [
			'Architected dual-hub SD-WAN across 200+ sites to ensure 100% uptime for critical traffic.',
			'Migrated legacy switching to Cisco ACI (VXLAN) fabric; implemented Azure Virtual WAN hub-and-spoke architectures with NVAs.',
			'Engineered transition from legacy Cisco ASA/Firepower and Palo Alto environments to FortiGate Next-Generation Firewalls.',
			'Served as Level 4 escalation and Senior Design Authority; engineered visibility fabric using Gigamon TAPs and Viavi Observer for deep-packet inspection across two data centers.',
			'Standardized network and IPAM configurations using Ansible, AWX, and Python.',
		],
	},
	{
		title: 'Network Architect',
		org: 'Data Center',
		period: '2012 — 2018',
		bullets: [
			'Implemented AWS Direct Connect; engineered OpenStack (OVS) and VMware DVS environments for private cloud networking.',
			'Orchestrated transition to Cisco ACI and Nexus 7000 VDCs, eliminating Spanning Tree and optimizing multi-tenant traffic.',
			'Pioneered the organization\'s first Ansible/AWX deployment; developed custom Python and PowerShell modules for large-scale automation.',
			'Redesigned Internet Edge architecture; integrated FortiGate, Cisco Firepower, and Cisco ISE for identity-based campus security.',
		],
	},
	{
		title: 'Network Engineer',
		org: 'Military support',
		period: '2010 — 2012',
		bullets: [
			'Engineered high-availability military converged network (Voice, Data, Video) across campus, data center, and remote theater environments.',
			'Implemented advanced QoS policies to prioritize latency-sensitive traffic over satellite and tunnel-based links.',
			'Conducted security audits and hardening to maintain 100% DISA STIG compliance.',
		],
	},
];

export const previousRoles = [
	{ title: 'Network Engineer', org: 'NMCI NOC', period: '2008 — 2010', location: 'Norfolk, VA' },
	{ title: 'Network Administrator', org: 'Internet Service Provider', period: '2007 — 2008', location: 'Brandon, FL' },
	{ title: 'Cisco Failure Analysis Engineer', org: 'Cisco Manufacturer', period: '2006 — 2007', location: 'St. Petersburg, FL' },
	{ title: 'Fire Controlman, Work Center Supervisor', org: 'US Navy', period: '2000 — 2006', location: 'Norfolk, VA' },
];

export const certs = [
	{ name: 'Professional Cloud Architect', issuer: 'Google Cloud', year: '2025', highlight: true },
	{ name: 'Master of Science in Computer Science', issuer: 'State University', year: '2015', highlight: true },
	{ name: 'CCNP Enterprise / CCDP', issuer: 'Cisco', year: 'Previously held, 2022', highlight: false },
	{ name: 'Security+', issuer: 'PeopleCert', year: 'Previously held, 2012', highlight: false },
	{ name: 'ITILv3 Foundations', issuer: 'PeopleCert', year: 'Previously held, 2008', highlight: false }
];
