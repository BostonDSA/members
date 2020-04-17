REPO      := boston-dsa/members
RUNTIME   := nodejs12.x
STAGES    := build dev plan
TERRAFORM := latest
BUILD     := $(shell git describe --tags --always)

.PHONY: all apply clean clobber up $(STAGES)

all: package-lock.json package.zip

.docker:
	mkdir -p $@

.docker/$(BUILD)-plan: .docker/$(BUILD)-build
.docker/$(BUILD)-%: | .docker
	docker build \
	--build-arg RUNTIME=$(RUNTIME) \
	--build-arg AWS_ACCESS_KEY_ID \
	--build-arg AWS_DEFAULT_REGION \
	--build-arg AWS_SECRET_ACCESS_KEY \
	--build-arg TERRAFORM=$(TERRAFORM) \
	--build-arg TF_VAR_release=$(BUILD) \
	--iidfile $@ \
	--tag $(REPO):$(BUILD)-$* \
	--target $* .

package-lock.json package.zip: .docker/$(BUILD)-build
	docker run --rm --entrypoint cat $$(cat $<) $@ > $@

apply: .docker/$(BUILD)-plan
	docker run --rm \
	--env AWS_ACCESS_KEY_ID \
	--env AWS_DEFAULT_REGION \
	--env AWS_SECRET_ACCESS_KEY \
	$$(cat $<)

clean:
	rm -rf .docker

clobber: clean
	docker image ls $(REPO) --quiet | uniq | xargs docker image rm --force

up: .docker/$(BUILD)-build .env
	docker run --rm \
	--env-file .env \
	--publish 3000:3000 \
	$$(cat $<) \
	npm start

$(STAGES): %: .docker/$(BUILD)-%
