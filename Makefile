name    := members
runtime := nodejs10.x
build   := $(shell git describe --tags --always)
digest   = $(shell cat .docker/$(build)$(1))

.PHONY: all apply clean plan shell@%

all: package-lock.json package.zip

.docker:
	mkdir -p $@

.docker/$(build)@plan: .docker/$(build)@build
.docker/$(build)@%: | .docker
	docker build \
	--build-arg RUNTIME=$(runtime) \
	--build-arg AWS_ACCESS_KEY_ID \
	--build-arg AWS_DEFAULT_REGION \
	--build-arg AWS_SECRET_ACCESS_KEY \
	--build-arg TF_VAR_release=$(build) \
	--iidfile $@ \
	--tag boston-dsa/$(name):$(build)-$* \
	--target $* .

package-lock.json package.zip: .docker/$(build)@build
	docker run --rm -w /var/task/ $(call digest,@build) cat $@ > $@

apply: plan
	docker run --rm \
	--env AWS_ACCESS_KEY_ID \
	--env AWS_DEFAULT_REGION \
	--env AWS_SECRET_ACCESS_KEY \
	$(shell cat $<)

clean:
	-docker image rm -f $(shell sed G .docker/*)
	-rm -rf .docker *.zip

plan: all .docker/$(build)@plan

shell@%: .docker/$(build)@% .env
	docker run --rm -it $(call digest,@$*) /bin/bash
