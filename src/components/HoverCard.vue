<script setup>
import { VHover, VCard } from 'vuetify/components';
</script>

<template>
    <v-hover v-slot:default="{ isHovering, props }">
        <v-card v-bind="$attrs, props" :class="isHovering ? 'elevation-16' : undefined"  variant="tonal">
            <template v-for="(_, scopedSlotName) in $slots" #[scopedSlotName]="slotData">
                <slot :name="scopedSlotName" v-bind="slotData" />
            </template>
            <template v-for="(_, slotName) in $slots" #[slotName]>
                <slot :name="slotName" />
            </template>
        </v-card>
    </v-hover>
</template>