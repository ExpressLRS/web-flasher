<script setup>
import {VHover, VCard, VCardTitle, VCardText, VLayout, VImg, VLabel} from 'vuetify/components'

defineProps(['image', 'hoverImage', 'title', 'text'])
</script>

<template>
  <VHover v-slot:default="{ isHovering, props }">
    <VCard v-bind="$attrs, props" :class="isHovering ? 'elevation-16' : undefined" variant="tonal">
      <VLabel/>
      <VLayout align-center>
        <VFadeTransition  mode="out-in" type="transition" duration="200">
          <VImg :src="hoverImage" height="100px" width="100px" v-if="isHovering"/>
          <VImg :src="image" height="100px" width="100px" v-else/>
        </VFadeTransition>
      </VLayout>
      <VCardTitle>{{ title }}</VCardTitle>
      <VCardText>{{ text }}
      </VCardText>
    </VCard>
  </VHover>
</template>