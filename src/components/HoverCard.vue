<script setup>
import {VHover, VCard, VLayout, VImg} from 'vuetify/components'

defineProps(['image', 'hoverImage', 'title', 'text'])
</script>

<template>
  <v-hover v-slot:default="{ isHovering, props }">
    <v-card v-bind="$attrs, props" :class="isHovering ? 'elevation-16' : undefined" variant="tonal">
      <VLabel/>
      <VLayout align-center>
        <VImg :src="isHovering ? hoverImage : image" height="100px" width="100px"></VImg>
      </VLayout>
      <VCardTitle>{{ title }}</VCardTitle>
      <VCardText>{{ text }}
      </VCardText>
    </v-card>
  </v-hover>
</template>