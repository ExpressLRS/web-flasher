export const compareSemanticVersions = (a, b) => {
    // Split versions and discriminators
    const [v1, d1] = a.split('-')
    const [v2, d2] = b.split('-')

    // Split version sections
    const v1Sections = v1.split('.')
    const v2Sections = v2.split('.')

    // Compare main version numbers
    for (let i = 0; i < Math.max(v1Sections.length, v2Sections.length); i++) {
        const v1Section = parseInt(v1Sections[i] || 0, 10)
        const v2Section = parseInt(v2Sections[i] || 0, 10)

        if (v1Section > v2Section) return 1
        if (v1Section < v2Section) return -1
    }

    // If main versions are equal, compare discriminators
    if (!d1 && d2) return 1 // v1 is greater if it does not have discriminator
    if (d1 && !d2) return -1 // v2 is greater if it does not have a discriminator
    if (d1 && d2) return d1.localeCompare(d2) // Compare discriminators
    return 0 // Versions are equal
}

export const compareSemanticVersionsRC = (a, b) => {
    if (a === undefined || b === undefined) return 0;
    return compareSemanticVersions(a.replace(/-.*/, ''), b.replace(/-.*/, ''))
}
